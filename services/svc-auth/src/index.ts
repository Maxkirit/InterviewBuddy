import express from 'express';
import argon2 from 'argon2';
import axios from 'axios';
import { prisma, Prisma } from "./lib/prisma.js";
import { createAccessToken, createRefreshToken, rotateRefreshToken } from './lib/jwt.js';
import jwt from 'jsonwebtoken';
import {exportJWK, importSPKI, jwtVerify} from 'jose'
import dotenv from 'dotenv'
import { createPublicKey, randomBytes, createHash } from 'crypto'
import { base64, string, z } from 'zod';
import { access, readFileSync } from 'fs';
import {PendingOAuthSession, createNewSession, validateState, validateGooglePayload, seekUser, create3rdPartyUser, login3rdPartyUser} from './lib/3rdPartyAuthGoogle.js';
import { register } from 'module';

type ApiError = {
  error: string,
};

const clientId = process.env.CLIENT_ID;
if (!clientId) throw new Error("CLIENT_ID missing in .env file");
//will be fetched from vault like PRIVATE_KEY once setup
const clientSecret = readFileSync("/secrets/google_client_secret").toString("utf8").trim();
if (!clientSecret) throw new Error("CLIENT_SECRET missing");

const passwordSchema = z.string()
                        .min(8, {error: "Password too short", abort: true})
                        .max(128, {error: "Password too long", abort: true})
                        .refine((password) => /[A-Z]/.test(password), {error: "Missing at least 1 uppercase letter", abort: true})
                        .refine((password) => /[a-z]/.test(password), {error: "Missing at least 1 lowercase letter", abort: true})
                        .refine((password) => /[!@#$%^&*()+\-=[\]{};':"\\|,.<>/?~`]/.test(password), {error: "Missing at least 1 special character", abort: true});

const Login = z.object({
    email: z.email({error: "Wrong email format", abort: true}),
    password: passwordSchema,
});

const REFRESH_SECRET = readFileSync("/secrets/refresh_secret").toString("utf8").trim();

const oauthSessions= new Map<string, PendingOAuthSession>(); //map holding the "state":PendingOAuthSession() key value pairs,

//redirect_uri for third party auth, check notion for value
const redirectURI = process.env.REDIRECT_URI;
if (!redirectURI) throw new Error("REDIRECT_URI missing in .env file");

const PRIVATE_KEY = readFileSync('/secrets/jwt_private.pem', 'utf-8');
const app = express();
const port = 3000;

app.use(express.json());

//builds link
app.get('/auth/google/init', async(req, res) => {
    try {
        console.log("in auth/google/init\n");
        const session = createNewSession(oauthSessions);
        console.log(`created session:\n${session}\n`);
        const authURL = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectURI}&response_type=code&scope=openid%20email%20profile&state=${session.state}&code_challenge=${session.codeChallenge}&code_challenge_method=${session.codeChallengeMethod}`;
        return res.status(201).json({message: "OAuth session initialized", link: authURL});
    } catch (error) {
        console.log("in /auth/google/init error path\n");
        return res.status(500).json({error: "Hashing issue in svc-auth"});
    }
})

//validation logic after user completed logic in google's pop up
app.post('/auth/google/validate', async(req, res) => {
    try {
        console.log("in auth/google/validate");
        //receives state and code, must validate matching state before anything
        const codeVerifier = validateState(req.body.state, oauthSessions);
        if (codeVerifier?.error)
            throw (new Error(codeVerifier.error));
        console.log("state validated");
        //POST to google server code
        //has to be passed as query parameters
        const queryParams = new URLSearchParams({
            grant_type: "authorization_code",
            code: req.body.code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectURI,
            code_verifier: codeVerifier.codeVerifier ?? "", //should never be null in this path but TypeScript was unhappy
        });
        const googleTokens = await axios.post('https://oauth2.googleapis.com/token',
                                                queryParams.toString(), {
            headers: {"Content-Type": "application/x-www-form-urlencoded",}
        });
        //extract valid key from header
        const googleId = await validateGooglePayload(googleTokens);
        //wipe map entry, after validation if we ever want to do some retrying logic 
        oauthSessions.delete(req.body.state);
        console.log("payload validated");
        //login/register logic here
        const user = await seekUser(googleId);
        let userTokens;
        let status;
        if (!user) {
            userTokens = await create3rdPartyUser(googleId); 
            status = 201;
        } else {
            userTokens = await login3rdPartyUser(user.user.auth_id);
            status = 200;
        }
        console.log("function done");
        return res.status(status).json({ accessToken: userTokens.accessToken,
                                    refreshToken: userTokens.refreshToken,
                                    maxAge: userTokens.maxAge,
                                    message: "User registerd with role pending",
                                });
    } catch (error) {
        console.log("in validate google auth error path");
        //prisma stuff here
        if (error instanceof Prisma.PrismaClientKnownRequestError)
            return res.status(400).json({
                error: "Database constraint violation",
                code: error.code,
            });
        if (error instanceof Prisma.PrismaClientValidationError)
            return res.status(400).json({ error: "Invalid data shape" });
        if (error instanceof Prisma.PrismaClientInitializationError)
            return res.status(503).json({ error: "Database unavailable" });
        //axios stuff here
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            console.log(`axios error:\n${error}`);
            return res.status(error.response.status).json({error: error.response.data?.error ?? error.message});
        }
        if (!(error instanceof Error)){
            console.log("non axios error and non Error: ", error);
            return res.status(502).json({error: "Bad gateway (google?)"});
        }
        let errorMessage;
        if ((error as Error).message === 'state not found')
            errorMessage = 'Invalid state received';
        if ((error as Error).message === 'state expired')
            errorMessage = 'Auhtentication session timed out';
        if ((error as Error).message === 'Invalid audience')
            errorMessage = 'Invalid audience in google token';
        if ((error as Error).message === 'issuer not google')
            errorMessage = 'Token not issued by Google';
        if ((error as Error).message === 'Keys in rotation')
            return res.status(503).json({error: "3rd party auth in rotation, try again later"});
        return res.status(403).json({error: errorMessage});
    }
})

//can only access this route when tokenId === userId and modifyUserRole permission
//return new access and refresh tokens
app.patch('/auth/:userId/role', async(req, res) => {
    console.log("in update user roles table");
    const targetId = parseInt(req.params.userId);
    if (!targetId)
        return res.status(400).json({error: "Invalid userId in params"});
    if (!req.body.permissions.includes('modifyUserRole') || targetId !== req.body.tokenId)
        return res.status(403).json({error: "Invalid permissions for PATCH /auth/:userId/role"});
    try {
        console.log("permissions validated");
        const newRole = await prisma.roles.findUniqueOrThrow({
            where: { name: req.body.newRole }
        });
        console.log("role_id found");
        const update = await prisma.user_roles.update({
            where: { user_id: targetId },
            data: {
                role_id: newRole.role_id,
                updated_at: new Date(),
            }
        });
        console.log("user_roles updated");
        //return new access and refresh tokens
        const access = await createAccessToken(targetId);
        const refresh = await createRefreshToken(targetId);
        return res.status(200).json({message: "Permissions updated succesfully",
                                    accessToken: access,
                                    refreshToken: refresh.refreshToken,
                                    maxAge: refresh.maxAge,
        });
    } catch (error) {
        console.log("in update auth tables after role change error path");
        if (error instanceof Prisma.PrismaClientKnownRequestError)
            return res.status(400).json({
                error: "Database constraint violation",
                code: error.code,
            });
        if (error instanceof Prisma.PrismaClientValidationError)
            return res.status(400).json({ error: "Invalid data shape" });
        if (error instanceof Prisma.PrismaClientInitializationError)
            return res.status(503).json({ error: "Database unavailable" });
        return res.status(500).json({error: "Bad gateway (svc-auth)"});
    }
})

app.get('/auth/signing-key', async (req, res) => {
    try {
        const publicKeyPem = createPublicKey(PRIVATE_KEY).export({ type: 'spki', format: 'pem' })
        console.log("pub key created\n");
        const publicKey = await importSPKI(publicKeyPem, 'RS256')           // ← extrait la clé publique en PEM
        console.log("pub key extracted\n");
        const jwk = await exportJWK(publicKey);
        console.log("pub key extracted\n");
        return res.json({ keys: [{ ...jwk, use: 'sig', kid: 'svc-auth-key-1' }] })
        // use: 'sig',                // ← indique que cette clé sert à signer (pas à chiffrer)
        //    kid: 'svc-auth-key-1'    ← identifiant unique de la clé
    } catch (error) {
        if (error instanceof Error) {
            // Now TypeScript knows `error` has `name` and `message` properties
            if (error.name === 'JWKSInvalidKeyError' || error.name === 'JWKSNoMatchingKeyError') {
                return res.status(400).json({ error: 'Invalid or missing key' });
            } else if (error.name === 'TypeError' || (error as NodeJS.ErrnoException).code === 'ERR_INVALID_ARG_TYPE') {
                return res.status(400).json({ error: 'Invalid key format or input' });
            } else if (error.message.includes('invalid signature')) {
                return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
            } else {
                console.error('Server error:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
        } else {
            // Handle cases where `error` is not an instance of `Error` (e.g., a string or custom object)
            console.error('Unknown error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
});

app.post('/auth/auth-request', async (req, res) => {
    const result = Login.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({error: result.error});
    }
    const {email, password} = req.body;
    try {
        const userAuth = await prisma.auths.findUniqueOrThrow({
            where: {
                email: email,
            },
        });
        if (!userAuth.hashed_password)
            return res.status(401).json({error: "3rd party sign necessary"});
        if (await argon2.verify(userAuth.hashed_password , password)) {
            const response = await axios.get(`http://svc-user:3000/user/userid/${userAuth.auth_id}`);
            const accessToken = await createAccessToken(response.data.user_id);
            const refreshToken = await createRefreshToken(response.data.user_id);
            res.json({accessToken: accessToken, refreshToken: refreshToken.refreshToken, maxAge: refreshToken.maxAge});
        } else {
            return res.status(401).json({error: "Incorrect email or password"});
        }
    } catch(error) {
        //increment failed login
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res.status(401).json({error: "Incorrect email or password"});
        } else if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({error: error.response.data?.error ?? error.message});
        } else {
            return res.status(502).json({error: "Bad gateway"});
        }
    }
})

app.post('/auth/refresh-token', async (req, res) => {
    try {
        const oldRefresh = req.body?.refreshToken;
        if (!oldRefresh) {
            return res.status(404).json({error: "No refresh token"});
        }
        let decoded;
        try {
            decoded = jwt.verify(oldRefresh, REFRESH_SECRET) as jwt.JwtPayload;
        } catch(error) {
            return res.status(401).json({error: "Invalid refresh token"});
        }
        const result = await prisma.refresh_tokens.findUnique({
            where: {
                jti: decoded.jti,
            },
        });
        if (!result) {
            return res.status(401).json({error: "Refresh token not found"});
        }
        if (result.revoked_at) {
            return res.status(401).json({error: "Refresh token revoked"});
        }
        if (result.token_expiry < new Date()) {
            return res.status(401).json({error: "Refresh token expired"});
        }
        const newTokens = await rotateRefreshToken(result.jti, decoded.userId);
        res.json({refreshToken: newTokens.newRefresh, accessToken: newTokens.newAccess, refreshMaxAge: newTokens.refreshMaxAge});
    } catch(error) {
        return res.status(500).json({error: "Internal server error"});
    }
})

//revoke ALL refresh tokens (logout everywhere, admin delete, rotate tokens on permission change, etc)
app.patch('/auth/revoke/refresh-token/:userId', async (req, res) => {
    console.log("In revoke all refesh tokens route");
    console.log(req.body.permissions);
    const targetId = parseInt(req.params.userId);
    console.log(targetId, req.body.tokenId);
    if ((!req.body.permissions.includes('manageLogout') && !req.body.permissions.includes('logoutSelf')) ||
        (req.body.permissions.includes('logoutSelf') && targetId !== req.body.tokenId))
        return res.status(403).json({error: "Permissions denied for PATCH /auth/revoke/refresh-token/:userId"});
    try {
        console.log("updating tokens")
        const tokens = await prisma.refresh_tokens.updateMany({
            where: {user_id: targetId,
                    revoked_at: null,
            },
            data: {
                revoked_at: new Date(),
                updated_at: new Date(),
            }
        });
        return res.status(200).json({message: `Revoked ${tokens.count} refresh tokens`})
    } catch (error) {
        console.log("in revoke all refresh tokens error path");
        if (error instanceof Prisma.PrismaClientKnownRequestError)
            return res.status(400).json({
                error: "Database constraint violation",
                code: error.code,
            });
        if (error instanceof Prisma.PrismaClientValidationError)
            return res.status(400).json({ error: "Invalid data shape" });
        if (error instanceof Prisma.PrismaClientInitializationError)
            return res.status(503).json({ error: "Database unavailable" });
        return res.status(500).json({error: "Bad gateway (svc-auth)"});
    }
})

//revoke ONE refresh token (logout one device)
app.patch("/auth/revoke/refresh-token", async (req, res) =>{
    const oldRefreshToken = req.body?.refreshToken;
    if (!oldRefreshToken) {
        return res.status(404).json({error: "No refresh token"});
    }
    if (!req.body.permissions.includes('logoutSelf') && !req.body.permissions.includes('manageLogout'))
        return res.status(403).json({error: "Permissions denied on PATCH /auth/revoke/refesh-token"});
    let decoded;
    try {
        decoded = jwt.verify(oldRefreshToken, REFRESH_SECRET, {ignoreExpiration: true}) as jwt.JwtPayload;
    } catch(error) {
        return res.status(401).json({error: "Invalid refresh token"});
    }
    try {
        const revoke = await prisma.refresh_tokens.update({
            where: {
                jti: decoded.jti,
            },
            data: {
                updated_at: new Date(),
                revoked_at: new Date(),
            },
        });
    } catch (error) {
        return res.status(404).json({error: "Refresh Token non existent in database"});
    }
    return res.status(200).json({message: "refresh token revoked", userId: decoded.userId});
})

// app.patch("/auth/revoke/refresh-token/everywhere", async (req, res) =>{
//     const oldRefreshToken = req.body?.refreshToken;
//     if (!oldRefreshToken) {
//         return res.status(404).json({error: "No refresh token"});
//     }
//     let decoded;
//     try {
//         decoded = jwt.verify(oldRefreshToken, REFRESH_SECRET, {ignoreExpiration: true}) as jwt.JwtPayload;
//     } catch(error) {
//         return res.status(401).json({error: "Invalid refresh token"});
//     }
//     try {
//         const revoke = await prisma.refresh_tokens.updateMany({
//             where: {
//                 user_id: decoded.user_id,
//             },
//             data: {
//                 updated_at: new Date(),
//                 revoked_at: new Date(),
//             },
//         });
//     } catch (error) {
//         return res.status(404).json({error: "Refresh Token non existent in database"});
//     }
//     return res.status(200).json({message: "refresh tokens revoked", userId: decoded.userId});
// })

app.post("/auth/user", async (req, res) => {
    const loginParse = Login.safeParse({email: req.body.email, password: req.body.password}); //email and password validation
    if (!loginParse.success) {
        return res.status(400).json({error: loginParse.error});
    }
	if (req.body.email.endsWith("@deleted.local"))
    	return res.status(400).json({ error: "invalid email" });
    let user = await prisma.auths.findUnique({
        where: { email: req.body.email },
    });
    if (user !== null) {
        return res.status(409).json({error: "User already exists"});
    }
    let newUser;
    try {
        console.log("creating new user...\nHashing password...\n");
        const hashedPwd = await argon2.hash(req.body.password);
        console.log("hashed password...\n");
        newUser = await prisma.auths.create({
            data: {
                sub: null,
                email: req.body.email,
                hashed_password: hashedPwd,
            },
        });
        console.log("user created in db\n");
        //will return user_id
        const response = await axios.post(`http://svc-user:3000/user/profile/${newUser.auth_id}`, {
            email: req.body.email,
            name: req.body.name,
            surname: req.body.surname,
            role_type: req.body.role_type,
        });
        console.log("user created in auth\n");
        const permission = await prisma.roles.findUniqueOrThrow({
                where: {name: req.body.role_type},
            });
        const registerPermissions = await prisma.user_roles.create({
            data: {
                user_id: response.data.userId,
                role_id: permission.role_id,
                assigned_date: new Date(),
            },
        });
        const accessToken = await createAccessToken(response.data.userId);
        const refreshToken = await createRefreshToken(response.data.userId);
        return res.status(200).json({accessToken: accessToken,
                                    refreshToken: refreshToken.refreshToken, 
                                    maxAge: refreshToken.maxAge,
                                    message: "User succesfully registered"});
    } catch (error) {
        console.log("error path\n");
        if (error instanceof Error && error.message.includes("Hashing failed")) {
            return res.status(500).json({error: "Hashing failed"});
        }
        if (newUser?.auth_id)
        {
            try {
                const deletedUser = await prisma.auths.delete({
                    where: {auth_id: newUser.auth_id},
                });
            } catch (error) {
                return res.status(500).json({error: "Failed deletion of failed user creation"});
            }
        }
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            console.log(error);
            return res.status(error.response.status).json({error: error.response.data?.error ?? error.message});
        } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2001')
                return res.status(401).json({error: "Incorrect role type"});
        } else {
            return res.status(502).json({error: "Bad gateway"});
        }
    }
})

app.patch ("/auth/Token/delete/:user_id", async(req, res) => {
	const user_id = req.params.user_id
	if (req.body.role !== "admin")
		return res.status(403).json({error: "forbidden"});
	try {
        const revoke = await prisma.refresh_tokens.updateMany({
            where: {
                user_id: user_id,
            },
            data: {
                updated_at: new Date(),
                revoked_at: new Date(),
            },
        });
    } catch (error) {
        return res.status(404).json({error: "Refresh Token non existent in database"});
    }
})

app.listen(port, () =>{
	console.log(`listening on port ${port}`)
})
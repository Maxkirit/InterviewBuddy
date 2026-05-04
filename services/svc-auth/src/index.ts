import express from 'express';
import argon2 from 'argon2';
import axios from 'axios';
import { prisma, Prisma } from "./lib/prisma.js";
import { createAccessToken, createRefreshToken, rotateRefreshToken } from './lib/jwt.js';
import jwt from 'jsonwebtoken';
import {exportJWK, importSPKI} from 'jose'
import dotenv from 'dotenv'
import { createPublicKey } from 'crypto'

type ApiError = {
  message: string;
  code: number;
};

const REFRESH_SECRET = "changewhenvaultisup";


// dotenv.config() // {path: '...'} pour personnailiser ou est la cles
const secret = process.env.SECRETKEY
if (!secret) throw new Error('SECRETKEY manquante dans .env')

const app = express();
const port = 3000;

app.use(express.json())

app.get('/auth/signing-key', async (req, res) => {
  const publicKeyPem = createPublicKey(secret).export({ type: 'spki', format: 'pem' })
  const publicKey = await importSPKI(publicKeyPem, 'RS256')           // ← extrait la clé publique en PEM
  const jwk = await exportJWK(publicKey);
  res.json({ keys: [{ ...jwk, use: 'sig', kid: 'svc-auth-key-1' }] })
// use: 'sig',                // ← indique que cette clé sert à signer (pas à chiffrer)
//    kid: 'svc-auth-key-1'    ← identifiant unique de la clé
})

app.post('/auth/auth-request', async (req, res) => {
    const {email, password} = req.body;
    try {
        const userAuth = await prisma.auths.findUniqueOrThrow({
            where: {
                email: email,
            },
        });
        if (await argon2.verify(userAuth.hashed_password , password)) {
            // const response = await axios.get(`http://svc-user:3000/api/v1/userID/${userAuth.auth_id}`);
            // const accessToken = createAccessToken(response.data.userId); //add payload as a parameter
            // const refreshToken = createRefreshToken(response.data.userId);
            const accessToken = await createAccessToken(1);
            const refreshToken = await createRefreshToken(1);
            res.json({accessToken: accessToken, refreshToken: refreshToken.refreshToken, maxAge: refreshToken.maxAge});
        } else {
            return res.status(401).json({error: "Incorrect email or password"});
        }
    } catch(error) {
        //increment failed login
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res.status(401).json({error: "Incorrect email or password"});
        } else if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({error: error.response.data.message});
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

app.patch("/auth/refresh-token", async (req, res) =>{
    const oldRefreshToken = req.body?.refreshToken;
    if (!oldRefreshToken) {
        return res.status(404).json({error: "No refresh token"});
    }
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

app.post("/auth/user", async (req, res) => {
    //validate request body ?
    let user = await prisma.auths.findUnique({
        where: { email: req.body.email },
    });
    if (user !== null) {
        return res.status(409).json({error: "User already exists"});
    }
    try {
        console.log("creating new user...\nHashing password...\n");
        const hashedPwd = await argon2.hash(req.body.password);
        console.log("hashed password...\n");
        const newUser = await prisma.auths.create({
            data: {
                sub: null,
                email: req.body.email,
                hashed_password: hashedPwd,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });
        console.log("user created in db\n");
        //will return user_id
        const response = await axios.post(`http://svc-user:3000/svc-user/profile/${newUser.auth_id}`, {
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
                created_at: new Date (),
                updated_at: new Date(),
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
        //remove table entry here if error happens after it succeeded?
        if (error instanceof Error && error.message.includes("Hashing failed")) {
            return res.status(500).json({error: "Hashing failed"});
        }
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({error: error.response.data.message});
        } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2001')
                return res.status(401).json({error: "Incorrect role type"});
        } else {
            return res.status(502).json({error: "Bad gateway"});
        }
    }
})

app.listen(port, () =>{
	console.log(`listening on port ${port}`)
})
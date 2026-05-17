import axios from "axios";
import { randomBytes, createHash } from "node:crypto";
import { jwtVerify } from "jose";
import { prisma, Prisma } from "./prisma.js";
import { createAccessToken, createRefreshToken } from "./jwt.js";  

export const SESSION_TTL_MS = 2 * 60 * 1000; //TTL for state map entries in 3rd party auth
// required for third party auth, check notion for value
const clientId = process.env.CLIENT_ID;
if (!clientId) throw new Error("CLIENT_ID missing in .env file");


export interface GoogleKeys {
    kid: string,
    use: string,
    e: string,
    n: string,
    kty: string,
    alg: string,
}

export type PendingOAuthSession = {
    codeVerifier: string,
    createdAt: number,
}

//hashing: create a hash with the algo you want (sha256 here)
//digest is the result of hashing your data
//digesting the codeVerifier as base64url because of the following definition for google OAuth: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
export function createNewSession(sessionMap: Map<string, PendingOAuthSession>) {
    const state = randomBytes(8).toString("hex");
    const codeVerifier = randomBytes(32).toString('hex'); //32 bytes is approx 43 characters which is minimum accepted by Google
    const hash = createHash('sha256').update(codeVerifier);
    sessionMap.set(state, {codeVerifier: codeVerifier, createdAt: Date.now()});
    const codeChallenge = hash.digest("base64url");
    return {state: state, codeChallenge: codeChallenge, codeChallengeMethod: 'S256'};
}

export function validateState(state: string, sessionMap: Map<string, PendingOAuthSession>) {
    const oauth = sessionMap.get(state)
    if (!oauth)
        return {error: "state not found"};
    if (Date.now() -  oauth.createdAt > SESSION_TTL_MS)
        return {error: "state expired"};
    return {message: "state valid", codeVerifier: oauth.codeVerifier};
}

export async function validateGooglePayload(googleTokens: any) {
    const idToken = googleTokens.data.id_token;
    //currentKID is in token header
    const currentKID = JSON.parse(Buffer.from(idToken.split('.')[0], 'base64').toString());
    // console.log("googleToken:", googleTokens.data);
    console.log('current valid key:', currentKID);

    //verify google's token: fetch key from their JWKS endpoint, verify that aud === <our client_id> and that iss === accounts.google.com
    const googleKeys = await axios.get('https://www.googleapis.com/oauth2/v3/certs');
    // console.log("googleKeys: ", googleKeys.data);

    //find right key and validate
    const validKey = googleKeys.data.keys.find((key: GoogleKeys) => key.kid === currentKID.kid);
    if (!validKey)
        throw new Error("Keys in rotation");
    console.log("our valid key found: ", validKey);
    //decode idToken
    const {payload, protectedHeader} = await jwtVerify(idToken, validKey);

    console.log(`aud: ${payload.aud}\niss: ${payload.iss}`);
    if (payload.aud !== clientId)
        throw new Error("Invalid audience");
    if (payload.iss !== 'accounts.google.com' && payload.iss != 'https://accounts.google.com')
        throw new Error("issuer not google");
    return payload;
}

export async function seekUser(googleId: any) {
    console.log("in seek users");
    const {sub, email}  = googleId;
    const user = await prisma.auths.findUnique({
        where: {
            sub: sub,
            email: email,
        }
    });
    if (!user)
        return null;
    console.log("user found");
    return {user};
}

export async function create3rdPartyUser(googleId: any) {
    console.log("in create3rdPartyUser");
    const newUser = await prisma.auths.create({
        data: {
            sub: googleId.sub as string,
            email: googleId.email as string,
        },
    });
    console.log("auth table entry created");
    const userEntry = await axios.post(`http://svc-user:3000/user/profile/${newUser.auth_id}`, {
        email: googleId.email,
        name: googleId.given_name,
        surname: googleId.family_name,
        role_type: 'pending',
    });
    //register role in db, will need to be revoked later
    console.log("looking for role_id for pending in roles table");
    const permission = await prisma.roles.findUniqueOrThrow({
            where: {name: 'pending'},
        });
    console.log("registering permissions");
    const registerPermissions = await prisma.user_roles.create({
        data: {
            user_id: userEntry.data.userId,
            role_id: permission.role_id,
            assigned_date: new Date(),
        },
    });
    console.log("creating access tokens");
    const access = await createAccessToken(userEntry.data.userId);
    console.log("creating refrest tokens");
    const refresh = await createRefreshToken(userEntry.data.userId);
    return {userId: userEntry.data.userId, accessToken: access, refreshToken: refresh, maxAge: refresh.maxAge, message: "User registered as pending"};
}

export async function login3rdPartyUser(authId: number) {
    console.log("in login 3rd party");
    //sub verification made in seekUser
    const userEntry = await axios.get(`http://svc-user:3000/user/userid/${authId}`);
    console.log("user entry validated");
    const access = await createAccessToken(userEntry.data.user_id);
    const refresh = await createRefreshToken(userEntry.data.user_id);
    console.log("tokens created");
    return {userId: userEntry.data.userId, accessToken: access, refreshToken: refresh, maxAge: refresh.maxAge, message: "User logged in"};
}
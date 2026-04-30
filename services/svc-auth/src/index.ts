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


dotenv.config() // {path: '...'} pour personnailiser ou est la cles
const secret = process.env.SECRETKEY
if (!secret) throw new Error('SECRETKEY manquante dans .env')

const app = express();
const port = 3000;

app.use(express.json())

app.get('/api/v1/signing-key', async (req, res) => {
  const publicKeyPem = createPublicKey(secret).export({ type: 'spki', format: 'pem' })
  const publicKey = await importSPKI(publicKeyPem, 'RS256')           // ← extrait la clé publique en PEM
  const jwk = await exportJWK(publicKey);
  res.json({ keys: [{ ...jwk, use: 'sig', kid: 'svc-auth-key-1' }] })
// use: 'sig',                // ← indique que cette clé sert à signer (pas à chiffrer)
//    kid: 'svc-auth-key-1'    ← identifiant unique de la clé
})

app.post('/api/v1/request-auth', async (req, res) => {
    const {email, password} = req.body;
    try {
        const userAuth = await prisma.auths.findUniqueOrThrow({
            where: {
                email: email,
            },
        });
        if (await argon2.verify(userAuth.hashed_password , password)) {
            // const response = await axios.get(`http://svc-user:3000/api/v1/userID/${userAuth.auth_id}`);
            // const access_token = createAccessToken(response.data.userId); //add payload as a parameter
            // const refresh_token = createRefreshToken(response.data.userId);
            const accessToken = createAccessToken(1);
            const refreshToken = await createRefreshToken(1);
            res.json({access_token: accessToken, refresh_token: refreshToken});
        } else {
            return res.status(401).json({error: "Incorrect email or password"});
        }
    } catch(error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res.status(401).json({error: "Incorrect email or password"});
        } else if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({error: error.response.data.message});
        } else {
            return res.status(502).json({error: "Bad gateway"});
        }
    }
})

app.post('/api/v1/refresh', async (req, res) => {
    try {
        const oldRefresh = req.body?.refresh_token;
        if (!oldRefresh) {
            return res.status(401).json({error: "No refresh token"});
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
        res.json({refresh_token: newTokens.newRefresh, access_token: newTokens.newAccess});
    } catch(error) {
        return res.status(500).json({error: "Internal server error"});
    }
})

app.listen(port, () =>{
	console.log(`listening on port ${port}`)
})
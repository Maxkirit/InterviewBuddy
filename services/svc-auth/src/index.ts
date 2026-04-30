import express from 'express';
import argon2 from 'argon2';
import axios from 'axios';
import { prisma, Prisma } from "./lib/prisma.js";
import { createAccessToken, createRefreshToken, rotateRefreshToken } from './lib/jwt.js';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

type ApiError = {
  message: string;
  code: number;
};

const REFRESH_SECRET = "changewhenvaultisup";

const app = express();
const port = 3000;

app.use(express.json())

app.use(cookieParser());

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
            // // query auth-db for the users's permissions
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
        const oldRefresh = req.cookies?.refresh_token;
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
        const newRefresh = rotateRefreshToken(result.jti, decoded.userId);
        res.json({refresh_token: newRefresh});
    } catch(error) {
        return res.status(500).json({error: "Internal server error"});
    }
})

app.listen(3000, () => {
    console.log(`Listening on port ${port}`);
})
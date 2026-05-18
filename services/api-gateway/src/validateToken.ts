import jwt from "jsonwebtoken";
import { importJWK, jwtVerify, errors } from 'jose';
import axios, { AxiosError } from "axios";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "./index.js";

export interface ReqWithUser extends Request {
    userId: number;
    permissions: string[];
	role: string;
}


async function getRefreshData(old_refresh_token: string) {
	const res = await axios.post("http://svc-auth:3000/auth/refresh", { refresh_token: old_refresh_token });
	return res.data;
}

export async function validateAcccessToken(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No access token found" });

    const [bearer, access_token] = authHeader.split(" ");
    if (bearer !== "Bearer")
        return res.status(401).json({ error: "Missing bearer" });

    //get key from auth-serv
    //this should/will be cached at start up to avoid getting it at every call
    try {
        const response = await axios.get("http://svc-auth:3000/auth/signing-key");
    	const jwk = response.data.keys[0];
    	const publicKey = await importJWK(jwk, 'RS256');
    	const { payload } = await jwtVerify(access_token, publicKey);
        (req as ReqWithUser).userId = payload.userId as number;
        (req as ReqWithUser).permissions = payload.permissions as string[];
		(req as ReqWithUser).role = payload.role as string;
        return next(); //valid access_token
    } catch (error) {
        console.log(`validateaccesstoken error path: ${error}`);
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res
                .status(error.response.status)
                .json({ error: error.response.data?.error ?? error.message });
        } else if (error instanceof errors.JWTExpired)
            return res.status(401).json({ error: "Token expired" });
        else if (error instanceof errors.JWSSignatureVerificationFailed)
            return res.status(401).json({ error: "Tampered token" });
        else if (error instanceof errors.JOSEError)
            return res.status(401).json({ error: "Invalid token" });
        else return res.status(500).json({ error: "Auth-serv error" });
    }
}

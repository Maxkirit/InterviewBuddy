import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import axios from "axios";
import { Request, Response, NextFunction } from "express";

async function getKey(): Promise<string> {
	const res = await axios.get("http://svc-auth:3000/auth/signing-key");
	return res.data.keys[0];
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
    if (!authHeader) return res.status(401).json({ error: "Missing header" });

    const [bearer, access_token] = authHeader.split(" ");
    if (bearer !== "Bearer")
        return res.status(401).json({ error: "Missing bearer" });

    //get key from auth-serv
    //this should/will be cached at start up to avoid getting it at every call
    let key: string;
    try {
        key = await getKey();
    } catch (error) {
        return res.status(500).json({ error: "Auth-svc error" });
    }

    //checking signature of access_token
    try {
        req.body.user = jwt.verify(access_token, key); // not sure what is up here
        return next(); //valid access_token
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError)
            return res.status(401).json({ error: "Token expired" });
        else if (error instanceof jwt.JsonWebTokenError)
            return res.status(401).json({ error: "Invalid token" });
        else return res.status(500).json({ error: "Auth-serv error" });
    }
}

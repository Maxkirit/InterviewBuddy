import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import axios, { AxiosError } from "axios";
import { Request, Response, NextFunction } from "express";

export interface ReqWithUser extends Request {
    userId: number;
    permissions: string[];
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
    // let key: string;
    try {
        // const response = await axios.get("http://svc-auth:3000/auth/signing-key");

        
    } catch (error) {
        if (error instanceof AxiosError)
            return res.status(500).json({ error: error.message});
    }
    //checking signature of access_token
    try {
        const key = 'changewhenvaultisup'; //ACCESS_SECRET
        //REMOVE IGNORE EXPIRATION IN PROD !!!
        const decoded = jwt.verify(access_token, key, {ignoreExpiration: true}) as jwt.JwtPayload; // not sure what is up here
        (req as ReqWithUser).userId = decoded.userId;
        (req as ReqWithUser).permissions = decoded.permissions;
        return next(); //valid access_token
    } catch (error) {
        console.log("validateaccesstoken error path\n");
        if (error instanceof jwt.TokenExpiredError)
            return res.status(401).json({ error: "Token expired" });
        else if (error instanceof jwt.JsonWebTokenError)
            return res.status(401).json({ error: "Invalid token" });
        else return res.status(500).json({ error: "Auth-serv error" });
    }
}

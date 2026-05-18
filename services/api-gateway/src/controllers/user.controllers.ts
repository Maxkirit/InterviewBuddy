import { Request, Response } from "express";
import { ApiError } from "../index.js";
import axios, { AxiosError } from "axios";
import { ReqWithUser } from "../validateToken.js";
import { file } from "zod";
import sharp from "sharp";

export const getUser = async (req: Request, res: Response) => {
    const { user_id } = req.params;
    const tokenReq = req as ReqWithUser;
    console.log("in get user info");
    const token_id = tokenReq.userId;
    const permissions = tokenReq.permissions;
    try {
        console.log("token_id:", token_id);
        console.log("perm", permissions);
        const user = await axios.get(`http://svc-user:3000/user/${user_id}`, {
            params: {
                token_id: token_id,
                perm: permissions,
            },
        });
        return res.status(200).json(user.data);
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status)
            return res
                .status(e.response.status)
                .json({ error: e.response.data?.error ?? e.message });
        return res.status(502).json({ error: "Bad gateway" });
    }
};

export const getUserPublic = async (req: Request, res: Response) => {
    const { user_id } = req.params;
    const tokenReq = req as ReqWithUser;
    const token_id = tokenReq.userId;
    const permissions = tokenReq.permissions;
    console.log(`in get user public, user_id: ${user_id}`);
    try {
        const user = await axios.get(
            `http://svc-user:3000/user/${user_id}/public`,
            {
                params: {
                    token_id: token_id,
                    perm: permissions,
                },
            },
        );
        return res.status(200).json(user.data);
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status)
            return res
                .status(e.response.status)
                .json({ error: e.response.data?.error ?? e.message });
        return res.status(502).json({ error: "Bad gateway" });
    }
};

export const listConnections = async (req: Request, res: Response) => {
    try {
        const id = req.params.user_id;
        const result = await axios.get(
            `http://svc-user:3000/user/${id}/connections`,
            {
                params: {
                    userId: (req as ReqWithUser).userId,
                    permissions: (req as ReqWithUser).permissions,
                },
            },
        );
        res.status(200).json({
            connections: result.data.connections,
            message: "Connection list retrieved",
        });
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res
                .status(error.response.status)
                .json({ error: error.response.data?.error ?? error.message });
        }
        return res.status(502).json({ error: "Bad gateway" });
    }
};

//this route is not used for images
// in this route
export const updateUserInfo = async (req: Request, res: Response) => {
	const { user_id } = req.params;
    console.log("in updateUser (api)\n");
	console.log(req.body);
    const REQUIRED_FIELDS = [
        "gender",
        "date_of_birth",
        "country",
        "job_title",
        "organization",
        "bio",
        "linkedin_link",
        "phone_number",
    ] as const; //as const makes the array type readonly['gender', 'email', etc] instead of string[]. Easy to derive a type from it later
    const missingFields = REQUIRED_FIELDS.filter(
        (field) => req.body[field] === undefined || req.body[field] === null,
    );
    if (missingFields.length > 0){
		console.log("missing field");
        return res.status(400).json({
            error: "Missing fields in request",
            missing: missingFields,
        });
	}

    console.log("validated fields\n");
    try {
        const response = await axios.patch(
            `http://svc-user:3000/user/profile/${user_id}`,
            {
                body: req.body,
                permissions: (req as ReqWithUser).permissions,
                userId: (req as ReqWithUser).userId,
            },
        );
        console.log("request succeeded, returning\n");
        return res.status(201).json({ message: "User profile updated" });
    } catch (error) {
        console.log("in error path\n");
        if (axios.isAxiosError<ApiError>(error) && error.response?.status)
            return res
                .status(error.response.status)
                .json({ error: error.response.data?.error ?? error.message });
        return res.status(502).json({ error: "Bad gateway (api gateway)" });
    }
};

//client wants to upload an avatar, queries svc-user
//nginx proxy guarantees file size is < 5mb (?)
//api-gateway validates MIME type to ensure requested upload is valid (other validation steps)
//svc-user validates permissions and stores ressource on shared volume at /data/app/avatar/:user_id
//api gateway returns 201 uploaded
//client queries route /data/app/avatar/:user_id to nginx to get picture
export const uploadAvatar = async (req: Request, res: Response) => {
    if (!req.body) return res.status(400).json({ error: "no files uploaded" });

    //check magic bytes of req body. If the right bytes are not there, refuse
    const validMagicBytes = [
        [0xff, 0xd8, 0xff], //jpeg, first 4 bytes
        [0x89, 0x50, 0x4e, 0x47],
    ]; //png
    const bytes = new Uint8Array(req.body);
    const isJpeg =
        validMagicBytes[0][0] === bytes[0] &&
        validMagicBytes[0][1] === bytes[1] &&
        validMagicBytes[0][2] === bytes[2];
    const isPng =
        validMagicBytes[1][0] === bytes[0] &&
        validMagicBytes[1][1] === bytes[1] &&
        validMagicBytes[1][2] === bytes[2] &&
        validMagicBytes[1][3];
    if (!isJpeg && !isPng)
        return res.status(400).json({ error: "Not an image" });
    //check with sharp if file is not malicious
    let image;
    try {
        console.log("in sharp validation");
        image = await sharp(bytes)
            .resize({ width: 512, height: 512 }) //limits size and standardizes for easier frontend handling
            .toFormat("jpeg", { quality: 80 }) //forces conversion to jpeg for standardisation
            .toBuffer(); //const image is a buffer, easier to send to svc-user
    } catch (error) {
        console.log("sharp error path");
        return res.status(400).json({ error: "Invalid image format or file" });
    }

    try {
        console.log(`route param userid in uploadAvatar: ${req.params.userId}`);
        const response = await axios.put(
            `http://svc-user:3000/user/${req.params.userId}/avatar`,
            {
                permissions: (req as ReqWithUser).permissions,
                userId: (req as ReqWithUser).userId,
                imageContent: image.toString("base64"),
            },
        );
        return res.status(201).json({ message: "Avatar uploaded" });
    } catch (error) {
        console.log("in normal error path");
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res
                .status(error.response.status)
                .json({ error: error.response.data?.error ?? error.message });
        }
        return res.status(502).json({ error: "Bad gateway (api gateway)" });
    }
};

export const getAvatarURL = async (req: Request, res: Response) => {
    try {
        const response = await axios.get(
            `http://svc-user:3000/user/${req.params.userId}/avatar`,
            {
                params: {
                    permissions: (req as ReqWithUser).permissions,
                    userId: (req as ReqWithUser).userId,
                },
            },
        );
        console.log("(req as ReqWithUser).permissions");
        return res.status(200).json(response.data);
    } catch (error) {
        console.log("in error path");
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res
                .status(error.response.status)
                .json({ error: error.response.data?.error ?? error.message });
        }
        return res.status(502).json({ error: "Bad gateway (api gateway)" });
    }
};

export const addConnection = async (req: Request, res: Response) => {
    const { user_id, link_id } = req.params;
    try {
        const response = await axios.post(
            `http://svc-user:3000/user/${user_id}/connections/${link_id}`,
            {
                userId: (req as ReqWithUser).userId,
                permissions: (req as ReqWithUser).permissions,
            },
        );
        return res.status(201).json(response.data);
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status) {
            return res
                .status(error.response.status)
                .json({ error: error.response.data?.error ?? error.message });
        }
        return res.status(502).json({ error: "Bad gateway" });
    }
};

export const getLink = async(req:Request, res: Response) =>{
	console.log("try to get invite link");
	try{
		const response = await axios.get(
            `http://svc-user:3000/user/link/generate`,
            {
				params:{
					token_id : (req as ReqWithUser).userId,
					permissions: (req as ReqWithUser).permissions,
				}
            })
		return res.status(200).json(response.data);
	}
	catch(error){
		console.log("error api-gateway getLink");
		return res.status(502).json({error: "bad gateway"});
	}
};

export const heartbeat = async(req:Request, res: Response) =>{
    try {
        await axios.patch(`http://svc-user:3000/user/${(req as ReqWithUser).userId}/heartbeat`);
        res.status(201).json({message: "heartbeat recorded"});
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status) {
            return res
                .status(error.response.status)
                .json({ error: error.response.data?.error ?? error.message });
        }
        return res.status(502).json({ error: "Bad gateway" });
    }
};

export const deleteConnection = async(req: Request, res: Response) =>{
	const { user_id, connectionId } = req.params;
	try{
		const response = await axios.patch(`http://svc-user:3000/user/connections/${user_id}/${connectionId}`, {
			    userId: (req as ReqWithUser).userId,
                permissions: (req as ReqWithUser).permissions,
				role: (req as ReqWithUser).role,
		})
		console.log("delete in api gatway ok");
		return res.status(200).json(response.data);
	}
	catch(error){
		console.log("error axios response for delete connection")
		return res.status(502).json({error: "bad gateway"})
	}

};

export const deleteUser = async (req: Request, res: Response) => {
	const { user_id } = req.params;
	const tokenReq = req as ReqWithUser;
	try {
		const response = await axios.patch(
			`http://svc-user:3000/user/${user_id}/delete`,
			{
				userId: tokenReq.userId,
				permissions: tokenReq.permissions,
				role: tokenReq.role,
			}
		);
		return res.status(200).json(response.data);
	} catch (error) {
		if (axios.isAxiosError<ApiError>(error) && error.response?.status)
			return res.status(error.response.status).json({ error: error.response.data?.error ?? error.message });
		return res.status(502).json({ error: "Bad gateway" });
	}
};

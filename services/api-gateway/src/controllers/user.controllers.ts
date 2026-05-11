import { Request, Response } from 'express';
import type { ApiError } from '../index.js';
import axios, { AxiosError } from 'axios';
import { ReqWithUser } from '../validateToken.js';

export const getUser = async(req: Request, res: Response) =>{
	const { user_id } = req.params; 
	const tokenReq = req as ReqWithUser;
	console.log("in get user info");
	const token_id = tokenReq.userId;
  	const permissions = tokenReq.permissions;
	try{
		console.log('token_id:', token_id);
		console.log('perm', permissions);
		const user = await axios.get(`http://svc-user:3000/user/${user_id}`,{
			params :{
				token_id: token_id,
				perm: permissions
			}
		})
		return(res.status(200).json(user.data))
	}
	catch(e){
		if (axios.isAxiosError(e) && e.response?.status)
			return res.status(e.response.status).json({error: e.response.data.error})
		return res.status(502).json({ error: 'Bad gateway' });
	}
};

export const listConnections = async (req: Request, res: Response) => {
	try {
		const id = req.params.user_id;
        const result = await axios.get(`http://svc-user:3000/user/${id}/connections`, {
			params: {
				userId: (req as ReqWithUser).userId,
				permissions: (req as ReqWithUser).permissions,
			}
		});
        res.status(200).json({connections: result.data.connections, message: "Connection list retrieved"});
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({ error: error.response.data.message });
        }
        return res.status(502).json({ error: 'Bad gateway' });
    }
};

//this route is not used for images
// in this route
export const updateOwnUserInfo = async (req: Request, res: Response) => {
    console.log("in updateOwnUser\n");
    const REQUIRED_FIELDS = [
        'gender', 'date_of_birth', 'country', 'job_title',
        'organization', 'bio', 'linkedin_link', 'phone_number'
    ] as const; //as const makes the array type readonly['gender', 'email', etc] instead of string[]. Easy to derive a type from it later
    const missingFields = REQUIRED_FIELDS.filter(field => req.body[field] === undefined || req.body[field] === null);
    if (missingFields.length > 0)
        return res.status(400).json({error: "Missing fields in request", missing: missingFields});
    console.log("validated fields\n");
    try {
        const response = await axios.patch(`http://svc-user:3000/user/profile/${(req as ReqWithUser).userId}`, {
            body: req.body,
            permissions: (req as ReqWithUser).permissions,
            userId: (req as ReqWithUser).userId,
        });
        console.log("request succeeded, returning\n");
        return res.status(201).json({message: "User profile updated"});
    } catch (error) {
        console.log("in error path\n");
        if (axios.isAxiosError<ApiError>(error) && error.response?.status)
            return res.status(error.response.status).json({error: error.response});
        return res.status(502).json({error: "Bad gateway (api gateway)"});
    }
}

//client wants to upload an avatar, queries svc-user
//svc-user generates an encoded url for minio like http://minio/avatar/<uuid encoding that hides the real resource>
//svc-user updates users and avatars db with new link
//svc-user queries minio for it to presign the URL for a 5min validity
//svc-user receives presigned url, is it different ?
//svc-user sends back url to client through api gateway
//client uploads to minio
//minio queries svc-user to confirm upload
//svc-user updates avatars db to confirm upload
//if upload never done, serve old profile pic ?
export const uploadAvatar = async (req: Request, res: Response) => {
    //validation stuff here probably
    try {
        const response = await axios.put(`http://svc-user:3000/user/${(req as ReqWithUser).userId}/avatar`, {
            permissions: (req as ReqWithUser).permissions,
        });
        //await response from client to confirm to svc-user ?
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status)
            return res.status(error.response.status).json({error: error.response.data.message});
        return res.status(502).json({error: "Bad gateway (api gateway)"});
    }

}

export const dowloadAvatar = async (req: Request, res: Response) => {

}

export const addConnection = async(req: Request, res: Response) =>{
	const { user_id, link_id } = req.params;
	try {
		const response = await axios.post(
			`http://svc-user:3000/user/${user_id}/connections/${link_id}`, {
				userId: (req as ReqWithUser).userId,
				permissions: (req as ReqWithUser).permissions
			}
		);
		return res.status(201).json(response.data)
	}
	catch (error) {
		if (error instanceof AxiosError && error.response?.status) {
			return res.status(error.response.status).json({ error: error.response.data.error })
		}
		return res.status(502).json({ error: 'Bad gateway' })
	}
};
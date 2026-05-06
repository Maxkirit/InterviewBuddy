import { Request, Response } from 'express';
import axios from 'axios';
import { ReqWithUser } from '../validateToken.js';
import { ApiError } from '../index.js';

export const getUser = async(req: Request, res: Response) =>{
	const { user_id } = req.params; 
	try{
		const user = await axios.get(`http://svc-user:3000/api/v1/user/${user_id}`)
		return(res.status(200).json(user.data))
	}
	catch(error){
		if (axios.isAxiosError(error) && error.response?.status)
			return res.status(error.response.status).json({error: error.response.data.message})
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
        res.status(200).json({message: "Connection list retrieved"});
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({ error: error.response.data.message });
        }
        return res.status(502).json({ error: 'Bad gateway' });
    }
}
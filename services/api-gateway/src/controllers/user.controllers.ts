import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { ReqWithUser } from '../validateToken.js';

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
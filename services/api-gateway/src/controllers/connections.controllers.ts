import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { ReqWithUser } from '../validateToken.js';

export const addConnection = async(req: Request, res: Response) =>{
	const { link_id } = req.params;
	try {
		const response = await axios.post(
			`http://svc-user:3000/api/v1/connections/${link_id}`, {
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

import { Request, Response } from 'express';
import axios from 'axios';

export const getUser = async(req: Request, res: Response) =>{
	const user_id = req.params;
	try{
		const user = await axios.get('http://svc-user:3000/api/v1/user/${user_id}')
		return(res.status(200).json(user.data))
	}
	catch(error){
		if (axios.isAxiosError(error) && error.response?.status)
			return res.status(error.response.status).json({error: error.response.data.message})
		return res.status(502).json({ error: 'Bad gateway' });
	}
};
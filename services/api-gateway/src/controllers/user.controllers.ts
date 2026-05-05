import { Request, Response } from 'express';
import { ApiError } from './auth.controllers.js';
import axios, { AxiosError } from 'axios';

export const getUser = async(req: Request, res: Response) =>{
	const { user_id } = req.params; 
	try{
		const user = await axios.get(`http://svc-user:3000/user/${user_id}`)
		return(res.status(200).json(user.data))
	}
	catch(error){
		if (axios.isAxiosError(error) && error.response?.status)
			return res.status(error.response.status).json({error: error.response.data.message})
		return res.status(502).json({ error: 'Bad gateway' });
	}
};

//this route is not used for images
export const updateOwnUserInfo = async (req: Request, res: Response) => {
    const REQUIRED_FIELDS = [
        'gender', 'date_of_birth', 'country', 'job_title',
        'organization', 'bio', 'linkedin_link', 'phone_number'
    ] as const; //as const makes the array type readonly['gender', 'email', etc] instead of string[]. Easy to derive a type from it later
    const missingFields = REQUIRED_FIELDS.filter(field => !req.body[field]);
    if (missingFields.length > 0)
        return res.status(400).json({error: "Missing fields in request", missing: missingFields});
    try {
        const response = await axios.patch(`http://svc-user:3000/user/profile/${(req as ReqWithUser).userId}`, req.body);
        return res.status(201).json({message: "User profile updated"});
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status)
            return res.status(error.response.status).json({error: error.response.data.message});
        return res.status(502).json({error: "Bad gateway (api gateway)"});
    }
}
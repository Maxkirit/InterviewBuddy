import { Request, Response } from 'express';
import axios from 'axios';
import { ReqWithUser } from '../validateToken.js';
import { ApiError } from '../index.js';

export const createRealInterview = async (req: Request, res: Response) => {
    try {
        const result = await axios.post("http://svc-interview-store:3000/interview/real-interview", {
            body: req.body,
            userId: (req as ReqWithUser).userId,
            permissions: (req as ReqWithUser).permissions,
        });
        res.status(201).json({message: "Interview created successfully"});
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({ error: error.response.data.message });
        }
        return res.status(502).json({ error: 'Bad gateway' });
    }
}

export const createMockInterview = async (req: Request, res: Response) => {
    try {
        const result = await axios.post("http://svc-interview-store:3000/interview/mock-interview", {
            body: req.body,
            userId: (req as ReqWithUser).userId,
            permissions: (req as ReqWithUser).permissions,
        });
        res.status(201).json({message: "Interview created successfully"});
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({ error: error.response.data.message });
        }
        return res.status(502).json({ error: 'Bad gateway' });
    }
}

export const getInterviewList = async (req: Request, res: Response) => {
	console.log('route redirect to interview');
	const { recruiter_id } = req.params;
	const tokenReq = req as ReqWithUser;

	const token_id = tokenReq.userId ?? req.query.token_id;
  	const permissions = tokenReq.permissions ?? JSON.parse(req.query.perm as string || '{}');
	try {
		console.log('recruiter_id:', recruiter_id);
		console.log('token_id:', token_id);
		console.log('permissions:', permissions);
		const result = await axios.get(`http://svc-interview-store:3000/interview/real-interviews`, {
			params: {
				recruiter_id: recruiter_id,
				token_id: token_id,
				perm: JSON.stringify(permissions)
			}
		});
		console.log("success");
		return res.status(200).json(result.data);
	} catch (e) {
		console.log("error");
		if (axios.isAxiosError(e) && e.response?.status)
			return res.status(e.response.status).json({ error: e.response.data.error });
		return res.status(502).json({ error: 'Bad gateway' });
	}
};

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

export const getInterviewList = async (req :Request, res: Response) =>{
	try{
		const result = await axios.post("http://svc-interview-store:3000/interview/interviewList/:user_id", {
            userId: (req as ReqWithUser).userId,
            permissions: (req as ReqWithUser).permissions,
        });
	}
}

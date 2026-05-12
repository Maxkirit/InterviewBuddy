import { Request, Response } from "express";
import axios from "axios";
import { ReqWithUser } from "../validateToken.js";
import { ApiError } from "../index.js";
import { permission } from "node:process";

export const createRealInterview = async (req: Request, res: Response) => {
    try {
        console.log(`interview body: ${req.body}`);
        const result = await axios.post(
            "http://svc-interview-store:3000/interview/real-interview",
            {
                body: req.body,
                userId: (req as ReqWithUser).userId,
                permissions: (req as ReqWithUser).permissions,
            },
        );
        res.status(201).json({ message: "Interview created successfully" });
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res
                .status(error.response.status)
                .json({ error: error.response.data?.error ?? error.message });
        }
        return res.status(502).json({ error: "Bad gateway" });
    }
};

export const createMockInterview = async (req: Request, res: Response) => {
    try {
        const result = await axios.post(
            "http://svc-interview-store:3000/interview/mock-interview",
            {
                body: req.body,
                userId: (req as ReqWithUser).userId,
                permissions: (req as ReqWithUser).permissions,
            },
        );
        res.status(201).json({ message: "Interview created successfully" });
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res
                .status(error.response.status)
                .json({ error: error.response.data?.error ?? error.message });
        }
        return res.status(502).json({ error: "Bad gateway" });
    }
};

export const getInterviewReal = async (req: Request, res: Response) => {
    console.log("route redirect to interview");
    const { recruiter_id } = req.params; // recuperer en param puis passer un query si vous trouver que c'est incoherent je modifie
    const tokenReq = req as ReqWithUser;

    const token_id = tokenReq.userId;
    const permissions = tokenReq.permissions;
    try {
        console.log("recruiter_id:", recruiter_id);
        console.log("token_id:", token_id);
        console.log("permissions:", permissions);
        const result = await axios.get(
            `http://svc-interview-store:3000/interview/real-interviews`,
            {
                params: {
                    recruiter_id: recruiter_id,
                    token_id: token_id,
                    perm: permissions,
                },
            },
        );
        console.log("success");
        return res.status(200).json(result.data);
    } catch (e) {
        console.log("error");
        if (axios.isAxiosError(e) && e.response?.status)
            return res
                .status(e.response.status)
                .json({ error: e.response.data?.error ?? e.message });
        return res.status(502).json({ error: "Bad gateway" });
    }
};

export const getInterviewCandidat = async (req: Request, res: Response) => {
    console.log("route redirect to interview");
    const { candidat_id } = req.params;
    const tokenReq = req as ReqWithUser;

    const token_id = tokenReq.userId;
    const permissions = tokenReq.permissions;
    try {
        console.log("candidat_id:", candidat_id);
        console.log("token_id:", token_id);
        console.log("permissions:", permissions);
        const result = await axios.get(
            `http://svc-interview-store:3000/interview/candidat-interviews`,
            {
                params: {
                    candidate_id: candidat_id,
                    token_id: token_id,
                    perm: permissions,
                },
            },
        );
        console.log("success");
        return res.status(200).json(result.data);
    } catch (e) {
        console.log("error");
        if (axios.isAxiosError(e) && e.response?.status)
            return res
                .status(e.response.status)
                .json({ error: e.response.data?.error ?? e.message });
        return res.status(502).json({ error: "Bad gateway" });
    }
};

export const getQuestion = async (req: Request, res: Response) => {
    const { question_id } = req.params;
    console.log(`getting question ${question_id}`);
    try {
        const result = await axios.get(
            `http://svc-interview-store:3000/interview/question/${question_id}`,
        );
        res.status(200).json(result.data);
    } catch (e) {
        console.log("in error path");
        if (axios.isAxiosError(e) && e.response?.status)
            return res
                .status(e.response.status)
                .json({ error: e.response.data?.error ?? e.message });
        return res.status(502).json({ error: "Bad gateway" });
    }
};

export const startInterview = async (req: Request, res: Response) => {
    const { interview_id } = req.params;
    try {
        const result = await axios.get(`http://svc-interview-store:3000/interview/${interview_id}/start`,{
            params: {
                user_id: (req as ReqWithUser).userId,
            }
        });
        res.status(200).json(result?.data);
    } catch (e) {
        console.log("in error path");
        if (axios.isAxiosError(e) && e.response?.status)
            return res
                .status(e.response.status)
                .json({ error: e.response.data?.error ?? e.message });
        return res.status(502).json({ error: "Bad gateway" });
    }
};

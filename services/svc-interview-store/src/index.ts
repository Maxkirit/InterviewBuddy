import express, { Request } from 'express';
import { prisma, Prisma } from "./lib/prisma.js";
import { int, z } from 'zod';
import axios from 'axios';

export interface ReqWithUser extends Request {
    userId: number;
    permissions: string[];
}

export type ApiError = {
  message: string;
  code: number;
};

const app = express();
const port = 3000;

const MockInterviewSchema = z.object({
    recruiter_id: z.null({error: "Expected no recruiter_id"}),
    candidate_id: z.int().min(1),
    question_id: z.int().min(1),
    job_title: z.null({error: "Expected no job_title"}),
    due_date: z.null({error: "Expected no due_date"}),
});

const RealInterviewSchema = z.object({
    recruiter_id: z.int().min(1),
    candidate_id: z.int().min(1),
    question_id: z.int().min(1),
    job_title: z.string(),
    due_date: z.date(),
});

app.use(express.json())

app.post('/interview/mock-interview', async (req, res) => {
    try {
        const interview = MockInterviewSchema.parse({
            recruiter_id: req.body.recruiter_id ? parseInt(req.body.recruiter_id) : null,
            candidate_id: parseInt(req.body.candidate_id),
            question_id: parseInt(req.body.question_id),
            job_title: req.body.job_title ? req.body.job_title : null,
            due_date: req.body.due_date ? req.body.due_date : null,
        });
        if (!(req as ReqWithUser).permissions.includes("createMockInterview") || (req as ReqWithUser).userId != interview.candidate_id) {
            return res.status(403).json({error: "No permissions for this actions"});
        }
        const result = await prisma.interviews.create({
            data: {...interview, status: "mock"},
        });
        res.status(201).json({message: "Interview created successfully"});
    } catch (error) {
        return res.status(502).json({error: "Bad gateway"});
    }
});

app.post('/interview/real-interview', async (req, res) => {
    try {
        const interview = RealInterviewSchema.parse({
            recruiter_id: req.body.recruiter_id ? parseInt(req.body.recruiter_id) : null,
            candidate_id: parseInt(req.body.candidate_id),
            question_id: parseInt(req.body.question_id),
            job_title: req.body.job_title ? req.body.job_title : null,
            due_date: req.body.due_date ? req.body.due_date : null,
        });
        if (!(req as ReqWithUser).permissions.includes("createRealInterview") || (req as ReqWithUser).userId != interview.recruiter_id) {
            return res.status(403).json({error: "No permissions for this actions"});
        }
        const check = await axios.get(`http://svc-user/user/connection-check/${interview.recruiter_id}/${interview.candidate_id}`);
        const result = await prisma.interviews.create({
            data: {...interview, status: "scheduled"},
        });
        res.status(201).json({message: "Interview created successfully"});
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res.status(error.response.status).json({ error: "Candidate not a connection" });
        }
        return res.status(502).json({error: "Bad gateway"});
    }
});

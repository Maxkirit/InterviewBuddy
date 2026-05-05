import express, { Request } from 'express';
import { prisma, Prisma } from "./lib/prisma.js";
import { z } from 'zod';

export interface ReqWithUser extends Request {
    userId: number;
    permissions: string[];
}

const app = express();
const port = 3000;

const InterviewSchema = z.object({
    recruiter_id: z.int().nullable(),
    candidate_id: z.int(),
    question_id: z.int(),
    job_title: z.string().nullable(),
    due_date: z.date().nullable(),
});

app.use(express.json())

app.post('/api/v1/interview', async (req, res) => {
    try {
        const interview = InterviewSchema.parse({
            recruiter_id: req.body.recruiter_id ? parseInt(req.body.recruiter_id) : null,
            candidate_id: parseInt(req.body.candidate_id),
            question_id: parseInt(req.body.question_id),
            job_title: req.body.job_title ? req.body.job_title : null,
            due_date: req.body.due_date ? req.body.due_date : null,
        });
        const status = interview.recruiter_id === null ? "mock" : "scheduled";
        if ((!(req as ReqWithUser).permissions.includes("createMockInterview") && !(req as ReqWithUser).permissions.includes("createRealInterview")) 
            || (!(req as ReqWithUser).permissions.includes("createMockInterview") && status === "mock") 
            || (!(req as ReqWithUser).permissions.includes("createRealInterview") && status === "scheduled")) {
            return res.status(403).json({error: "No permissions for this actions"});
        }
        const result = await prisma.interviews.create({
            data: {...interview, status: status},
        });
        res.status(201).json({message: "Interview created successfully"});
    } catch (error) {
        return res.status(502).json({error: "Bad gateway"});
    }
});
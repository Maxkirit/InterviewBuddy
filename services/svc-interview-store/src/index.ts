import express, { Request } from "express";
import { prisma, Prisma } from "./lib/prisma.js";
import { int, z } from "zod";
import axios from "axios";

export interface ReqWithUser extends Request {
    userId: number;
    permissions: string[];
}

export type ApiError = {
    error: string;
};

const app = express();
const port = 3000;

const MockInterviewSchema = z.object({
    recruiter_id: z.null({ error: "Expected no recruiter_id" }),
    candidate_id: z.int().min(1),
    question_id: z.int().min(1),
    job_title: z.null({ error: "Expected no job_title" }),
    due_date: z.null({ error: "Expected no due_date" }),
});

const RealInterviewSchema = z.object({
    recruiter_id: z.int().min(1),
    candidate_id: z.int().min(1),
    question_id: z.int().min(1),
    job_title: z.string(),
    due_date: z.date(),
    status: z.literal(["scheduled", "past_due_date", "completed", "graded"]),
});

app.set("query parser", "extended");
app.use(express.json());

app.post("/interview/mock-interview", async (req, res) => {
    try {
        const interview = MockInterviewSchema.parse({
            recruiter_id: req.body.recruiter_id
                ? parseInt(req.body.recruiter_id)
                : null,
            candidate_id: parseInt(req.body.candidate_id),
            question_id: parseInt(req.body.question_id),
            job_title: req.body.job_title ? req.body.job_title : null,
            due_date: req.body.due_date ? req.body.due_date : null,
        });
        if (
            !(req as ReqWithUser).permissions.includes("createMockInterview") ||
            (req as ReqWithUser).userId != interview.candidate_id
        ) {
            return res
                .status(403)
                .json({ error: "No permissions for this actions" });
        }
        const result = await prisma.interviews.create({
            data: { ...interview, status: "mock" },
        });
        res.status(201).json({ message: "Interview created successfully" });
    } catch (error) {
        return res.status(502).json({ error: "Bad gateway" });
    }
});

app.post("/interview/real-interview", async (req, res) => {
    try {
        console.log(req.body.body.recruiter_id);
        const interview = RealInterviewSchema.parse({
            recruiter_id: req.body.body.recruiter_id
                ? parseInt(req.body.body.recruiter_id)
                : null,
            candidate_id: parseInt(req.body.body.candidate_id),
            question_id: parseInt(req.body.body.question_id),
            job_title: req.body.body.job_title ? req.body.body.job_title : null,
            due_date: req.body.body.due_date ? new Date(req.body.body.due_date) : null,
            status: "scheduled",
        });
        console.log("input parsed");
        if (
            !req.body.permissions.includes("createRealInterview") ||
            req.body.userId != interview.recruiter_id
        ) {
            return res
                .status(403)
                .json({ error: "No permissions for this actions" });
        }
        const check = await axios.get(
            `http://svc-user:3000/user/connection-check/${interview.recruiter_id}/${interview.candidate_id}`,
        );
        console.log("is connection");
        const result = await prisma.interviews.create({
            data: { ...interview, status: "scheduled", due_date: new Date(interview.due_date) },
        });
        console.log("interview created");
        res.status(201).json({ message: "Interview created successfully" });
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            return res
                .status(error.response.status)
                .json({ error: "Candidate not a connection" });
        }
        return res.status(502).json({ error: "Bad gateway" });
    }
});

app.get("/interview/real-interviews", async (req, res) => {
    console.log("req.query:", req.query);
    const { recruiter_id, token_id } = req.query;
    const tmp = req.query.perm ?? {};
    const permission = Object.values(tmp) as string[];
    console.log("permission:", permission);

    if (recruiter_id === "all") {
        console.log("try to return all db to an admin");
        if (!permission.includes("manageInterview")) {
            return res.status(403).json({ error: "Forbidden" });
        }
        try {
            console.log("admin perm okay...");
            const interviews = await prisma.interviews.findMany();
            return res.status(200).json(interviews);
        } catch (e) {
            return res.status(500).json({ error: "Internal error" });
        }
    }

    if (
        !permission.includes("manageInterview") &&
        (recruiter_id !== token_id || !permission.includes("readInterview"))
    ) {
        return res.status(403).json({ error: "forbiden" });
    }
    console.log("access authorized for read interview");
    console.log("recruiter_id:", recruiter_id);
    console.log("token_id:", token_id);
    console.log("permissions:", permission);
    try {
        const interview = await prisma.interviews.findMany({
            where: { recruiter_id: parseInt(recruiter_id as string, 10) },
        });
        console.log("ici on passe");
        res.status(200).json(interview);
    } catch (e) {
        return res.status(500).json({ error: "internal error" });
    }
});

app.get("/interview/candidat-interviews", async (req, res) => {
    console.log("req.query:", req.query);
    const { candidate_id, token_id } = req.query;
    const tmp = req.query.perm ?? {};
    const permission = Object.values(tmp) as string[];

    if (
        !permission.includes("manageInterview") &&
        (candidate_id !== token_id || !permission.includes("readInterview"))
    ) {
        console.log("candidat_id:", candidate_id);
        console.log("token_id:", token_id);
        console.log("permissions:", permission);
        return res.status(403).json({ error: "forbiden" });
    }
    console.log("access authorized for read interview");
    console.log("candidat_id:", candidate_id);
    console.log("token_id:", token_id);
    console.log("permissions:", permission);
    try {
        const interview = await prisma.interviews.findMany({
            where: { candidate_id: parseInt(candidate_id as string, 10) },
        });
        console.log("ici on passe");
        res.status(200).json(interview);
    } catch (e) {
        return res.status(500).json({ error: "internal error" });
    }
});

app.get("/interview/question/:question_id", async (req, res) => {
    try {
        let questions;
        const id = req.params.question_id;
        console.log(`in get question ${id} `);
        if (id === "all") {
            questions = await prisma.questions.findMany();
        } else {
            questions = await prisma.questions.findUniqueOrThrow({
                where: { question_id: parseInt(id) },
            });
        }
        res.status(200).json(questions);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res
                .status(400)
                .json({ error: "Question not found", code: error.code });
        }
        return res.status(500).json({ error: "internal error" });
    }
});

app.get("/interview/:interview_id", async (req, res) => {
    try {
        console.log(req.params);
        const { interview_id } = req.params;
        const userId = parseInt(req.query.token_id as string);
        const tmp = req.query.permissions ?? {};
        const permissions = Object.values(tmp) as string[];
        if (!permissions.includes("readInterview")) {
            return res.status(403).json({ error: "does not have the required permissions" });
        }
        const interview = await prisma.interviews.findUniqueOrThrow({
            where: {
                unique_interview_id: parseInt(interview_id),
            },
            include: { questions: true },
        })
        console.log(interview);
        if (interview.candidate_id != userId && interview.recruiter_id != userId) {
            return res.status(403).json({ error: "forbidden" });
        }
        res.status(200).json(interview);
    } catch (error) {
        console.log(`in error path: ${error}`);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res
                .status(400)
                .json({ error: "Interview not found", code: error.code });
        }
        return res.status(500).json({ error: "internal error" });
    }
});

app.get("/interview/:interview_id/start", async (req, res) => {
    try {
        const { interview_id } = req.params;
        const userId = parseInt(req.query.user_id as string);
        const tmp = req.query.permissions ?? {};
        const permissions = Object.values(tmp) as string[];
        if (!permissions.includes("takeInterview")) {
            return res.status(403).json({ error: "does not have the required permissions" });
        }
        const interview = await prisma.interviews.findUniqueOrThrow({
            where: {
                unique_interview_id: parseInt(interview_id),
            },
            include: { questions: true },
        })
        console.log(interview);
        if (interview.candidate_id !== userId || interview.status !== "scheduled") {
            return res.status(403).json({ error: "forbidden" });
        }
        res.status(200).json(interview);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res
                .status(400)
                .json({ error: "Interview not found", code: error.code });
        }
        return res.status(500).json({ error: "internal error" });
    }
});

app.patch("/interview/:interview_id/submit", async (req, res) => {
    try {
        const { interview_id } = req.params;
        const userId = parseInt(req.body.user_id);
        const permissions = req.body.permissions;
        if (!permissions.includes("takeInterview")) {
            return res.status(403).json({ error: "does not have the required permissions" });
        }
        const interview = await prisma.interviews.findUniqueOrThrow({
            where: {
                unique_interview_id: parseInt(interview_id),
            },
        });
        if (interview.candidate_id !== userId || interview.status !== "scheduled") {
            return res.status(403).json({ error: "forbidden" });
        }
        const updated = await prisma.interviews.update({
            where: {
                unique_interview_id: parseInt(interview_id),
            },
            data: {
                status: "completed",
                unfinished_text: req.body.body.reasoning,
            }
        });
        res.status(200).json(updated);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res
                .status(400)
                .json({ error: "Error submitting interview", code: error.code });
        }
        return res.status(500).json({ error: "internal error" });
    }
});

app.patch("/interview/:interview_id", async (req, res) => {
    try {
        const { interview_id } = req.params;
        const userId = parseInt(req.body.userId);
        const permissions = req.body.permissions;
        if (!permissions.includes("updateInterview")) {
            return res.status(403).json({ error: "does not have the required permissions" });
        }
        const interview = await prisma.interviews.findUniqueOrThrow({
            where: {
                unique_interview_id: parseInt(interview_id),
            },
        });
        if (interview.recruiter_id !== userId) {
            return res.status(403).json({ error: "forbidden" });
        }
        const input = {
            recruiter_id: req.body.body.recruiter_id ?? interview.recruiter_id,
            candidate_id: req.body.body.candidate_id ?? interview.candidate_id,
            question_id: req.body.body.question_id ?? interview.question_id,
            job_title: req.body.body.job_title ?? interview.job_title,
            due_date: req.body.body.due_date ?? interview.due_date,
            status: req.body.body.status ?? interview.status,
        };
        const parsed = RealInterviewSchema.parse(input);
        const updated = await prisma.interviews.update({
            where: {
                unique_interview_id: parseInt(interview_id),
            },
            data: parsed,
        });
        res.status(200).json(updated);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res
                .status(400)
                .json({ error: "Error submitting interview", code: error.code });
        }
        return res.status(500).json({ error: "internal error" });
    }
});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});

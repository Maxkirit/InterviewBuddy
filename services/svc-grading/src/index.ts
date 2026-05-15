import express, { Request, Response } from "express";
import { prisma, Prisma } from "./lib/prisma.js";
import z from "zod";
import axios from "axios";

const app = express();
const port = 3000;

const GradingReportSchema = z.object({
    unique_interview_id: z.int().min(1),
    report: z.string().min(1),
});

app.set("query parser", "extended");
app.use(express.json());

app.post('/grading/grading-report', async (req: Request, res: Response) => {
    try {
        const parsed = GradingReportSchema.parse(req.body.body);
        const interview = await axios.get(`http://svc-interview-store:3000/interview/${parsed.unique_interview_id}`, {
            params: {
                token_id: req.body.userId,
                permissions: req.body.permissions,
            }
        });
        if (interview.data.recruiter_id != req.body.userId || !req.body.permissions.includes("createGradingReport")) {
            return res.status(403).json({error: "User does not have the required permissions"});
        }
        await prisma.grading_reports.create({
            data: {unique_interview_id: parsed.unique_interview_id as number, report: parsed.report}
        });
        res.status(201).json({message: "grading report created"});
    } catch (error) {
        console.error("error path:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res.status(400).json({
                error: "Database constraint violation",
                code: error.code,
            });
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
            // Schema mismatch — e.g. passing a string where Prisma expects an int
            return res.status(400).json({ error: "Invalid data shape" });
        }

        if (error instanceof Prisma.PrismaClientInitializationError) {
            return res.status(503).json({ error: "Database unavailable" });
        }

        // Catch-all: always have this as your last line
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/grading/grading-report', async (req: Request, res: Response) => {
    try {
        console.log(req.query);
        const interview_id = req.query.interview_id as string;
        const userId = req.query.user_id;
        const tmp = req.query.permissions ?? {};
        const permissions = Object.values(tmp) as string[];
        console.log(permissions);
        if (!permissions.includes('readGradingReport')) {
            return res.status(403).json({error: "User does not have the required permission"});
        }
        const interview = await axios.get(`http://svc-interview-store:3000/interview/${interview_id}`, {
            params: {
                token_id: userId,
                permissions: permissions,
            }
        });
        if (interview.data.recruiter_id != userId && interview.data.candidate_id != userId) {
            return res.status(403).json({error: "Interview does not belong to the user"});
        }
        const report = await prisma.grading_reports.findFirstOrThrow({
            where: {
                unique_interview_id: parseInt(interview_id),
            }
        });
        res.status(200).json(report);
    } catch (error) {
        console.error("error path:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res.status(400).json({
                error: "Database constraint violation",
                code: error.code,
            });
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
            // Schema mismatch — e.g. passing a string where Prisma expects an int
            return res.status(400).json({ error: "Invalid data shape" });
        }

        if (error instanceof Prisma.PrismaClientInitializationError) {
            return res.status(503).json({ error: "Database unavailable" });
        }

        // Catch-all: always have this as your last line
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});

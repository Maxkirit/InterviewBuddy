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

app.use(express.json());

app.post('/grading/grading-report', async (req: Request, res: Response) => {
    try {
        const parsed = GradingReportSchema.safeParse(req.body.body);
        const interview = await axios.get(`http://svc-interview-store:3000/interview/${parsed.data?.report}`);
        if (interview.data.recruiter_id != req.body.userId || !req.body.permissions.includes("createGradingReport")) {
            return res.status(403).json({error: "User does not have the required permissions"});
        }
        await prisma.grading_reports.create({
            data: {unique_interview_id: parsed.data?.unique_interview_id, report: parsed.data?.report}
        });
    } catch (error) {
        console.error("new user error path:", error);
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

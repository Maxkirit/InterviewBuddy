import { Request, Response } from "express";
import axios from "axios";
import { ReqWithUser } from "../validateToken.js";
import { ApiError } from "../index.js";

export const createGradingReport = async (req: Request, res: Response) => {
    const REQUIRED_FIELDS = [
        "unique_interview_id",
        "report",
    ] as const;
    const missingFields = REQUIRED_FIELDS.filter(
        (field) => req.body[field] === undefined || req.body[field] === null,
    );
    if (missingFields.length > 0){
		console.log("missing field");
        return res.status(400).json({
            error: "Missing fields in request",
            missing: missingFields,
        });
	}
    try {
        const response = await axios.post(
            `http://svc-grading:3000/grading/grading-report`,
            {
                body: req.body,
                permissions: (req as ReqWithUser).permissions,
                userId: (req as ReqWithUser).userId,
            },
        );
        return res.status(201).json({ message: "Grading report created" });
    } catch (error) {
        console.log("in error path\n");
        if (axios.isAxiosError<ApiError>(error) && error.response?.status)
            return res
                .status(error.response.status)
                .json({ error: error.response.data?.error ?? error.message });
        return res.status(502).json({ error: "Bad gateway (api gateway)" });
    }
};

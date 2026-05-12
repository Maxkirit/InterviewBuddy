import { Router } from "express";
import {
    createRealInterview,
    createMockInterview,
    getInterviewReal,
    getInterviewCandidat,
    getQuestion,
    startInterview
} from "../controllers/interview.controllers.js";

const router = Router();

router.post("/real-interview", createRealInterview);
router.post("/mock-inteview", createMockInterview);
router.get("/real-interviews/:recruiter_id", getInterviewReal);
router.get("/candidat-interviews/:candidat_id", getInterviewCandidat);
router.get("/question/:question_id", getQuestion);
router.get("/:interview_id/start", startInterview);
export default router;

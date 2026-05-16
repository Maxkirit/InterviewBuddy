import { Router } from "express";
import {
    createRealInterview,
    createMockInterview,
    getInterviewReal,
    getInterviewCandidat,
    getQuestion,
    getInterviewById,
    startInterview,
    submitInterview,
	deleteInterview
} from "../controllers/interview.controllers.js";

const router = Router();

router.post("/real-interview", createRealInterview);
router.post("/mock-inteview", createMockInterview);
router.get("/real-interviews/:recruiter_id", getInterviewReal);
router.get("/candidat-interviews/:candidat_id", getInterviewCandidat);
router.get("/question/:question_id", getQuestion);
router.get("/:interview_id", getInterviewById);
router.get("/:interview_id/start", startInterview);
router.patch("/:interview_id/submit", submitInterview);
router.patch("/:interview_id/delete", deleteInterview);
export default router;

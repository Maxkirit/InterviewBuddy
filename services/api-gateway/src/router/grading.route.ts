import { Router } from "express";
import { createGradingReport, getGradingReport } from "../controllers/grading.controllers.js";

const router = Router();

router.post("/grading-report", createGradingReport);
router.get("/grading-report", getGradingReport);
export default router;
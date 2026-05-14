import { Router } from "express";
import { createGradingReport } from "../controllers/grading.controllers.js";

const router = Router();

router.post("/grading-report", createGradingReport);
export default router;

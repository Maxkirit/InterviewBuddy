import { Router } from 'express';
import { createRealInterview, createMockInterview } from '../controllers/interview.controllers.js';

const router = Router()

router.post('/real-interview', createRealInterview);
router.post('/mock-inteview', createMockInterview);

export default router
import { Router } from 'express';
import { createRealInterview, createMockInterview, getInterviewList } from '../controllers/interview.controllers.js';

const router = Router()

router.post('/real-interview', createRealInterview);
router.post('/mock-inteview', createMockInterview);
router.get('/interviewList', getInterviewList);

export default router
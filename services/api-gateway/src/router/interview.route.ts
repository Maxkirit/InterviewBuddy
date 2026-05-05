import { Router } from 'express';
import { createInterview } from '../controllers/interview.controllers.js';

const router = Router()

router.post('/interview', createInterview);

export default router
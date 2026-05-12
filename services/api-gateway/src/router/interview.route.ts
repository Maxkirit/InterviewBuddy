import { Router } from 'express';
import { createRealInterview, createMockInterview, getInterviewReal, getInterviewCandidat} from '../controllers/interview.controllers.js';

const router = Router()

router.post('/real-interview', createRealInterview);
router.post('/mock-inteview', createMockInterview);
router.get('/real-interviews/:recruiter_id', getInterviewReal);
router.get('/candidat-interviews/:candidat_id', getInterviewCandidat);
export default router
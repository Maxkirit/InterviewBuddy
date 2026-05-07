import { Router } from 'express';
import { login, refresh, registrationFlow } from '../controllers/auth.controllers.js';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/register', registrationFlow);
export default router
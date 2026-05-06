import { Router } from 'express';
import { login, refresh, registrationFlow } from '../controllers/auth.controllers.js';

const router = Router();

router.post('/login', login);
router.post('/register', registrationFlow);
router.post('/refresh', refresh);
export default router
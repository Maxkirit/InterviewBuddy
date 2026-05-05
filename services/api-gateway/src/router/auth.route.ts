import { Router } from 'express';
import { login, refresh, logout, registrationFlow } from '../controllers/auth.controllers.js';

const router = Router()

router.post('/login', login)
router.post('/registration', registrationFlow)
export default router
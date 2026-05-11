import { Router } from 'express';
import { login, refresh, registrationFlow, externalRegistrationFlow } from '../controllers/auth.controllers.js';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/register', registrationFlow);
router.post('/external-register', externalRegistrationFlow); //must be post method
export default router
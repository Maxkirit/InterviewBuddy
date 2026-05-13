import { Router } from 'express';
import { login, refresh, registrationFlow, intializeExternalAuth } from '../controllers/auth.controllers.js';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/register', registrationFlow);
router.get('/google/init', intializeExternalAuth); //must be post method
export default router
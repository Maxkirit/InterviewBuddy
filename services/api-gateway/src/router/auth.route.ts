import { Router } from 'express';
import { login, refresh, registrationFlow, intializeExternalAuth, validateExternalAuth} from '../controllers/auth.controllers.js';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/register', registrationFlow);
router.get('/google/init', intializeExternalAuth);
router.get('/google/validate', validateExternalAuth);
export default router
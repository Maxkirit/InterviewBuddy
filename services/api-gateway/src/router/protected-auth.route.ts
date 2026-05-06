import { Router } from 'express';
import { logout } from '../controllers/auth.controllers.js';

const router = Router()

//close SSE connections, propagate logout state after refresh token validation
router.get('/logout', logout)
export default router;
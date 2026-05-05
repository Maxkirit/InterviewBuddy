import { Router } from 'express';
import { refresh, logout } from '../controllers/auth.controllers.js';

const router = Router()

router.get('/refresh', refresh)
//close SSE connections, propagate logout state after refresh token validation
router.get('/logout', logout)
export default router;
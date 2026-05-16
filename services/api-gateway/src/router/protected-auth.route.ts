import { Router } from 'express';
import { logout, chooseUserRole} from '../controllers/auth.controllers.js';

const router = Router()

//close SSE connections, propagate logout state after refresh token validation
router.get('/logout', logout)
router.patch('/:userId/role', chooseUserRole)
export default router;
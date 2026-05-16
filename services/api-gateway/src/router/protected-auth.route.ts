import { Router } from 'express';
import { logout, chooseUserRole, logoutEverywhere} from '../controllers/auth.controllers.js';

const router = Router()

//close SSE connections, propagate logout state after refresh token validation
router.patch('/:userId/role', chooseUserRole)
router.get('/logout', logout);
router.get('/logout/everywhere', logoutEverywhere);
export default router;
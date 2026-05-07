import { Router } from 'express';
import { getUser, listConnections, updateOwnUserInfo, dowloadAvatar, uploadAvatar } from '../controllers/user.controllers.js';

const router= Router()

router.get('/:user_id/connections', listConnections);
router.get('/:user_id', getUser);
router.patch('/profile', updateOwnUserInfo);
router.put('/avatar/:user_id', uploadAvatar);
router.get('/avatar/:user_id', uploadAvatar);

export default router

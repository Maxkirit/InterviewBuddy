import { Router } from 'express';
import { getUser, listConnections } from '../controllers/user.controllers.js';
import { getUser, updateOwnUserInfo, dowloadAvatar, uploadAvatar, addConnection } from '../controllers/user.controllers.js';

const router= Router()

router.get('/:user_id/connections', listConnections);
router.get('/:user_id', getUser);
router.patch('/profile', updateOwnUserInfo);
router.put('/avatar/:user_id', uploadAvatar);
router.get('/avatar/:user_id', uploadAvatar);
router.post('/:user_id/connections/:link_id', addConnection);

export default router

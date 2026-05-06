import { Router } from 'express';
import { getUser, updateOwnUserInfo, dowloadAvatar, uploadAvatar } from '../controllers/user.controllers.js';

const router= Router()

router.get('/:user_id', getUser)
router.patch('/user/profile', updateOwnUserInfo)
router.put('/user/avatar/:user_id', uploadAvatar)
router.get('/user/avatar/:user_id', uploadAvatar)

export default router
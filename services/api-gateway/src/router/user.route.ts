import { Router } from 'express';
import { getUser, updateOwnUserInfo } from '../controllers/user.controllers.js';

const router= Router()

router.get('/:user_id', getUser)
router.patch('/profile/:user_id', updateOwnUserInfo)

export default router
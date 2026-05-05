import { Router } from 'express';
import { getUser } from '../controllers/user.controllers.js';

const router= Router()

router.get('/:user_id', getUser)

export default router
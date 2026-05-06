import { Router } from 'express';
import { getUser, addConnection } from '../controllers/user.controllers.js';

const router= Router()

router.get('/:user_id', getUser)
router.post('/:user_id/connections/:link_id', addConnection);

export default router
import { Router } from 'express';
import { getUser, listConnections } from '../controllers/user.controllers.js';

const router= Router()

router.get('/:user_id/connections', listConnections);
router.get('/:user_id', getUser);

export default router
import { Router } from 'express';
import { addConnection } from '../controllers/connections.controllers.js';

const router = Router();

router.post('/addConnection/:link_id', addConnection);

export default router
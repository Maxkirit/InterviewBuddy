import express, { Router } from 'express';
import { getUser, updateOwnUserInfo, getAvatarURL, uploadAvatar, listConnections  } from '../controllers/user.controllers.js';

const router= Router();

router.get('/:user_id/connections', listConnections);
router.get('/:user_id', getUser);
router.patch('/profile', updateOwnUserInfo);

router.post('/avatar/:userId', express.raw({type: ['image/jpeg', 'image/png']}), uploadAvatar); //allows single file uploaded, called avatar
router.get('/avatar/:userId', getAvatarURL);

export default router

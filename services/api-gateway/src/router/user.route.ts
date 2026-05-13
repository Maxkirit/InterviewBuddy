import express, { Router } from "express";
import {
    getUser,
    addConnection,
    listConnections,
    updateUserInfo,
    getAvatarURL,
    uploadAvatar,
    getUserPublic,
	getLink
} from "../controllers/user.controllers.js";

const router = Router();

router.get("/:user_id/connections", listConnections);
router.get("/:user_id", getUser);
router.get("/:user_id/public", getUserPublic);
router.patch("/profile/:user_id", updateUserInfo);
router.post(
    "/avatar/:userId",
    express.raw({ type: ["image/jpeg", "image/png"] }),
    uploadAvatar,
); //allows single file uploaded, called avatar
router.get("/link/generate", getLink);
router.get("/avatar/:userId", getAvatarURL);
router.post("/:user_id/connections/:link_id", addConnection);

export default router;

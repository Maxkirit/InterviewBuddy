import express, { Router } from "express";
import {
    getUser,
    addConnection,
    listConnections,
    updateOwnUserInfo,
    getAvatarURL,
    uploadAvatar,
    getUserPublic,
} from "../controllers/user.controllers.js";

const router = Router();

router.get("/:user_id/connections", listConnections);
router.get("/:user_id", getUser);
router.get("/:user_id/public", getUserPublic);
router.patch("/profile", updateOwnUserInfo);
router.post(
    "/avatar/:userId",
    express.raw({ type: ["image/jpeg", "image/png"] }),
    uploadAvatar,
); //allows single file uploaded, called avatar
router.get("/avatar/:userId", getAvatarURL);
router.post("/:user_id/connections/:link_id", addConnection);

export default router;

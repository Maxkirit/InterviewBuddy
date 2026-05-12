import { Router } from "express";
import {
    getUser,
    addConnection,
    listConnections,
    updateUserInfo,
    dowloadAvatar,
    uploadAvatar,
    getUserPublic,
} from "../controllers/user.controllers.js";

const router = Router();

router.get("/:user_id/connections", listConnections);
router.get("/:user_id", getUser);
router.get("/:user_id/public", getUserPublic);
router.patch("/profile/:user_id", updateUserInfo);
router.put("/avatar/:user_id", uploadAvatar);
router.get("/avatar/:user_id", uploadAvatar);
router.post("/:user_id/connections/:link_id", addConnection);

export default router;

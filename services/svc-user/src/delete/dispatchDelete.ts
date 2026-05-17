import { Request, Response, } from 'express'
import { prisma } from '../lib/prisma.js'
import axios from "axios";

async function revokeTokensAndDisableAuth(targetId: number, callerId: number, permissions: string[]): Promise<void> {
	//Révoquer tous les refresh tokens du user cible
	await axios.patch(`http://svc-auth:3000/auth/revoke/refresh-token/${targetId}`, {
		permissions: permissions,
		tokenId: callerId,
	});
	console.log(`all tokens from ${targetId} revoked`);

	//Désactiver le compte auth + anonymiser l'email
	await axios.patch(`http://svc-auth:3000/auth/disable/${targetId}`, {
		permissions: permissions,
		tokenId: callerId,
	});
	console.log(`auth account ${targetId} disabled`);
}

export const DeleteUser = async (req: Request, res: Response) => {
	const { userId, permissions, role } = req.body;
	const user_id = Number(req.params?.user_id);

	// Admin supprime un autre user
	if (role === "admin" && userId !== user_id) {
		if (!permissions?.includes("manageUserInfo"))
			return res.status(403).json({ error: "forbidden" });

		try {
			console.log(`admin ${userId} try to delete user : ${user_id}`);
			await revokeTokensAndDisableAuth(user_id, userId, permissions);
		} catch (error) {
			console.log("error revoking tokens or disabling auth");
			return res.status(500).json({ error: "internal server error" });
		}
	}
	// User se supprime lui-même
	else if (userId === user_id && permissions?.includes("deleteUserInfo")) {
		console.log(`user ${userId} try to delete himself`);
		try {
			await revokeTokensAndDisableAuth(user_id, userId, permissions);
		} catch (error) {
			console.log("error revoking tokens or disabling auth");
			return res.status(500).json({ error: "internal server error" });
		}
	}
	else {
		return res.status(403).json({ error: "forbidden" });
	}
}

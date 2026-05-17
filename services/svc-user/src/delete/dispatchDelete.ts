import { Request, Response, } from 'express'
import { prisma } from '../lib/prisma.js'
import axios from "axios";

async function revokeTokensAndDisableAuth(targetId: number, callerId: number, permissions: string[], auth_id: number): Promise<void> {
	// 1. Révoquer tous les refresh tokens du user cible
	await axios.patch(`http://svc-auth:3000/auth/revoke/refresh-token/${targetId}`, {
		permissions: permissions,
		tokenId: callerId,
	});
	console.log(`all tokens from ${targetId} revoked`);

	// 2. Désactiver le compte auth + anonymiser l'email
	await axios.patch(`http://svc-auth:3000/auth/disable/${targetId}`, {
		permissions: permissions,
		userId: callerId,
		auth_id: auth_id,
	});
	console.log(`auth account ${targetId} disabled`);
}

export const DeleteUser = async (req: Request, res: Response) => {
	const { userId, permissions, role } = req.body;
	const user_id = Number(req.params?.user_id);

	// Récupérer le user cible pour obtenir son auth_id
	const user = await prisma.users.findUnique({ where: { user_id } });
	if (!user)
		return res.status(404).json({ error: "user not found" });

	// Admin supprime un autre user
	if (role === "admin" && userId !== user_id) {
		if (!permissions?.includes("manageUserInfo"))
			return res.status(403).json({ error: "forbidden" });

		try {
			console.log(`admin ${userId} try to delete user : ${user_id}`);
			await revokeTokensAndDisableAuth(user_id, userId, permissions, user.auth_id);
		} catch (error) {
			console.log("error revoking tokens or disabling auth");
			return res.status(500).json({ error: "internal server error" });
		}
	}
	// User se supprime lui-même
	else if (userId === user_id && permissions?.includes("deleteUserInfo")) {
		console.log(`user ${userId} try to delete himself`);
		try {
			await revokeTokensAndDisableAuth(user_id, userId, permissions, user.auth_id);
		} catch (error) {
			console.log("error revoking tokens or disabling auth");
			return res.status(500).json({ error: "internal server error" });
		}
	}
	else {
		return res.status(403).json({ error: "forbidden" });
	}

	// Suite : soft delete interviews, connexions, user
}

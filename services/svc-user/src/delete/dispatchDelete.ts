import { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import axios from "axios";
import { deleteConnectionByIds } from '../connections/deleteConnection.js'

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

async function deleteAllConnections(user_id: number): Promise<void> {
	// Récupérer toutes les connexions actives du user
	const connections = await prisma.connections.findMany({
		where: {
			is_active: true,
			OR: [
				{ recruiter_id: user_id },
				{ candidate_id: user_id },
			]
		}
	});

	console.log(`found ${connections.length} active connections for user ${user_id}`);

	// Appel direct sans HTTP — pas de vérification de permissions nécessaire
	for (const conn of connections) {
		try {
			await deleteConnectionByIds(conn.recruiter_id, conn.candidate_id);
		} catch (error) {
			console.log(`error deleting connection ${conn.recruiter_id}/${conn.candidate_id} — continuing`);
		}
	}
}

export const DeleteUser = async (req: Request, res: Response) => {
	const { userId, permissions, role } = req.body;
	const user_id = Number(req.params?.user_id);

	// Récupérer le user cible pour obtenir son auth_id
	const user = await prisma.users.findUnique({ where: { user_id } });
	if (!user)
		return res.status(404).json({ error: "user not found" });

	// Vérification des permissions
	const isAdmin = role === "admin" && userId !== user_id && permissions?.includes("manageUserInfo");
	const isSelf  = userId === user_id && permissions?.includes("deleteUserInfo");

	if (!isAdmin && !isSelf)
		return res.status(403).json({ error: "forbidden" });

	// ── ÉTAPE 1 : Révoquer tokens + désactiver auth (bloquant) ──
	try {
		await revokeTokensAndDisableAuth(user_id, userId, permissions, user.auth_id);
	} catch (error) {
		console.log("error revoking tokens or disabling auth");
		return res.status(500).json({ error: "internal server error" });
	}

	// ── ÉTAPE 2 : Supprimer connexions + interviews en cascade (non bloquant) ──
	try {
		await deleteAllConnections(user_id);
	} catch (error) {
		console.log("error deleting connections — continuing with user soft delete");
	}

	// ── ÉTAPE 3 : Soft delete du user + anonymisation email (bloquant) ──
	try {
		await prisma.users.update({
			where: { user_id },
			data: {
				deleted_at: new Date(),
				is_active: false,
				email: `deleted_${user_id}@deleted.local`,
				updated_at: new Date(),
			}
		});
		// Supprimer les invite_links du user
		await prisma.invite_link.deleteMany({
			where: { recruiter_id: user_id }
		});
		console.log(`user ${user_id} soft deleted`);
	} catch (error) {
		console.log("error soft deleting user");
		return res.status(500).json({ error: "internal server error" });
	}

	return res.status(200).json({ message: "user deleted successfully" });
}

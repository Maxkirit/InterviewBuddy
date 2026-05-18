import { Request, Response, } from 'express'
import { prisma } from '../lib/prisma.js'
import axios from 'axios'

// Fonction interne : soft-delete une connexion + cascade interviews
// Utilisable directement sans passer par HTTP (ex: dispatchDelete)
export async function deleteConnectionByIds(recruiter_id: number, candidate_id: number): Promise<void> {
	await prisma.connections.update({
		where: {
			recruiter_id_candidate_id: { recruiter_id, candidate_id }
		},
		data: { is_active: false }
	});
	console.log(`connexion between : ${recruiter_id} et ${candidate_id} deleted`);

	try {
		await axios.patch(`http://svc-interview-store:3000/interview/connection-delete`, {
			recruiter_id,
			candidate_id,
		});
		console.log(`interviews between ${recruiter_id} and ${candidate_id} soft deleted`);
	} catch (error) {
		console.log(`error cascading interview delete for ${recruiter_id}/${candidate_id} — connection deleted but interviews may remain`);
	}
}

export const DeleteConnection = async (req: Request, res: Response) => {
	const { userId, permissions, role } = req.body;
	const user_id = Number(req.params?.user_id);
	const connectionId = Number(req.params?.connectionId);

	console.log(`in Delete connection : ${req.body.role}`)
	let recruiter_id: number;
	let candidate_id: number;

	if (role === "recruiter") {
		recruiter_id = userId;
		candidate_id = connectionId;
	} else if (role === "candidate") {
		recruiter_id = connectionId;
		candidate_id = userId;
	} else if (role === "admin") {
		// L'admin passe recruiter_id en :user_id et candidate_id en :connectionId
		recruiter_id = user_id;
		candidate_id = connectionId;
	} else {
		return res.status(400).json({ error: "invalid role" });
	}

	const isParticipant = (userId === recruiter_id) || (userId === candidate_id);

	if (!permissions?.includes("deleteConnection") || (!isParticipant && !permissions?.includes("manageConnection"))) {
		console.log(`no permission for delete connection: isParticipant=${isParticipant}`);
		return res.status(403).json({ error: "forbidden" });
	}

	try {
		await deleteConnectionByIds(recruiter_id, candidate_id);
	} catch (error) {
		console.log("error when trying to delete connection in the db");
		return res.status(500).json({ error: "internal server error" });
	}

	return res.status(200).json({ message: "delete connection succes" });
}

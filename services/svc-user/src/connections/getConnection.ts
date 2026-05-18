import { Request, Response, } from 'express'
import { prisma, Prisma } from '../lib/prisma.js'

export const getConnection =  async (req: Request, res: Response) =>  {
	const userId = parseInt(req.params.userId as string);
	const id = parseInt(req.query.userId as string);
	const tmp = req.query.permissions ?? {};
	const permissions = Object.values(tmp) as string[];

	console.log(`userId=${userId} id=${id} permissions=${permissions}`);
	
	if (
		(!permissions?.includes("readConnection") &&
			!permissions?.includes("manageConnection")) ||
		(permissions?.includes("readConnection") && id != userId)
	) {
		return res
			.status(403)
			.json({ error: "No permissions for this actions" });
	}
	try {
		const connections = await prisma.connections.findMany({
			where: {
				OR: [{ candidate_id: userId }, { recruiter_id: userId }],
				status: "accepted",
				is_active: true,
			},
			select: {
				// When this user is the candidate, select the recruiter's info
				users_connections_recruiter_idTousers: {
					select: {
						user_id: true,
						firstname: true,
						lastname: true,
						profile_pic_url: true,
						organization: true,
						last_seen: true,
					},
				},
				// When this user is the recruiter, select the candidate's info
				users_connections_candidate_idTousers: {
					select: {
						user_id: true,
						firstname: true,
						lastname: true,
						profile_pic_url: true,
						last_seen: true,
					},
				},
			},
		});
		const connectedUsers = connections.map((conn) => {
			const recruiterSide = conn.users_connections_recruiter_idTousers;
			const candidateSide = conn.users_connections_candidate_idTousers;
			return recruiterSide?.user_id !== userId
				? recruiterSide
				: candidateSide;
		});
		console.log(connectedUsers);
		res.status(200).json({
			connections: connectedUsers,
			message: "Connections found",
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			return res
				.status(400)
				.json({ error: "No connections found", code: error.code });
		}
		return res
			.status(500)
			.json({ error: "Bad gateway in svc-user get/connections" });
	}
};

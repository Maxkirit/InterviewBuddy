import { Request, Response, } from 'express'
import { prisma, Prisma } from '../lib/prisma.js'

export const getAllConnections =  async (req: Request, res: Response) =>  {
	const tmp = req.query.permissions ?? {};
	const permissions = Object.values(tmp) as string[];

    console.log("Admin is trying to get all connections...");

	if (!permissions?.includes("manageConnection")) {
		return res.status(403).json({ error: "No permissions for this actions" });
	}
	try {
		console.log("Admin perm okay...");
		const connections = await prisma.connections.findMany({
			select: {
				recruiter_id: true,
				candidate_id: true,
				status: true,
				is_active: true,
				users_connections_recruiter_idTousers: {
					select: {
						user_id: true,
						firstname: true,
						lastname: true,
						profile_pic_url: true,
						organization: true,
					}
        		},
        		users_connections_candidate_idTousers: {
            		select: {
						user_id: true,
						firstname: true,
						lastname: true,
						profile_pic_url: true,
					}
        		},
    		}
		});
		return res.status(200).json({connections});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			return res.status(400).json({ error: "No connections found", code: error.code });
		}
		return res.status(500).json({ error: "Internal error" });
	}
};

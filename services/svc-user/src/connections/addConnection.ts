import { Request, Response, } from 'express'
import { prisma } from '../lib/prisma.js'


export const addConnection =  async (req: Request, res: Response) => 
{
	const { userId, permissions } = req.body;
	console.log(`try to add connections :${permissions}, id : ${req.body.userId} vs ${req.params.user_id}`)
	if (!permissions.includes("acceptConnection") || req.body.userId !== Number (req.params.user_id)) 
        return res.status(403).json({error: "No permissions for this actions"});
	try{
		const invite = await prisma.invite_link.findUnique({
  		where: { link:req.params.link_id as string}
		})	
		if (!invite)
			return res.status(404).json({error: "link not found"});

		if (invite.recruiter_id === Number(userId))
			return res.status(403).json({error : "recruiter_id & candidate_id are identical"});

		if (invite.expiry_date < new Date() )
			return res.status(410).json({error : "link has expired"});
		try {
		await prisma.connections.create({
			data: {
				recruiter_id: invite.recruiter_id,
				candidate_id: userId,
				status: 'accepted',
				accepted_at: new Date(),
			}
		});
			return res.status(201).json({message: "Connection successful"});
		} catch {
			return res.status(400).json({error: "connection already exists"});
		}
	}
	catch(e){
		return res.status(500).json({error: "internal server error"})
	}
};

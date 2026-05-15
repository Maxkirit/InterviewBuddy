import { Request, Response, } from 'express'
import { prisma } from '../lib/prisma.js'

export const DeleteConnection= async (req: Request, res: Response) =>{
	const {userId, role, permissions} = req.body;
	const user_id = Number (req.params?.userId);
	const connectionId = Number (req.params?.connectionId);
	
	let recruiter_id : number;
	let candidate_id : number;
	if (role == "admin"){
		recruiter_id = user_id;
		candidate_id = connectionId;
	}
	else if (role == "recruiter"){
		recruiter_id = user_id;
		candidate_id = connectionId;
	}
	else{
		recruiter_id = connectionId;
		candidate_id = user_id;
	}

	const isParticipant = (userId === recruiter_id || userId === candidate_id);

	if (!permissions?.includes("deleteConnection") || !isParticipant && !permissions?.includes("manageConnection")){
		console.log("no permission for delete connection ");
		return res.status(403).json({error :"forbiden"});
	}
	try{
		await prisma.connections.update({
			where: {
				recruiter_id_candidate_id: {
					recruiter_id,
					candidate_id
				}
			},
			data: {
				is_active: false,
			}
		});
		console.log(`connexion between : ${recruiter_id} et ${candidate_id} delete with succes`);
		res.status(200).json({message: "delete connection succes"});
	}
	catch(error){
		console.log("error when trying to delete connection in the db");
		res.status(500).json({error: "internal serveur error"});
	}

}

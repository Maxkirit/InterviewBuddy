import express from 'express';
import { PrismaClient } from "./generated/prisma/index.js";

const prisma = new PrismaClient();
const app= express();
const port = 3000;


app.get('/api/v1/matchUserId', async (req, res) =>{
	const {auth_id} = req.query as {auth_id: string};
	try{
		const user = await prisma.users.findUnique({
  		where: { auth_id: parseInt(auth_id, 10) },
		});
		if(!user) return res.status(401).json({error: "not find"})
		res.json({user_id: user.user_id})
	}
	catch(e){
		res.status(500).json({error: "internal error"})
	}
		

})

app.listen(port, ()=>{
	console.log(`listening on port ${port}`)
})

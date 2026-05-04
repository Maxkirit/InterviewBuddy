
import express from 'express';
import { prisma, Prisma } from "./lib/prisma.js";

const app = express();
const port = 3000;

app.get('/api/v1/matchUserId', async (req, res) => {
	const { auth_id } = req.query as { auth_id: string };
	try {
		const user = await prisma.users.findUnique({
			where: { auth_id: parseInt(auth_id, 10) },
		});
		if (!user) return res.status(401).json({ error: "not find" });
		res.json({ user_id: user.user_id });
	} catch (e) {
		res.status(500).json({ error: "internal error" });
	}
});

app.post('/svc-user/profile/:auth_id', async (req, res) =>{
    //validate permissions ? technically no access tokens in the request
    try {
        const newUser = await prisma.users.create({
            data: {
                auth_id: parseInt(req.params.auth_id as string),
                role: req.body.role_type,
                email: req.body.email,
                firstname: req.body.name,
                lastname: req.body.surname,
            },
        });
        return res.status(201).json({userId: newUser.user_id, message: "User created"});
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res.status(502).json({error: "Bad gateway"});
        }
    }
})

app.listen(port, () => {
	console.log(`listening on port ${port}`);
});
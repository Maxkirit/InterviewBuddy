
import express from 'express';
import { prisma } from "./lib/prisma.js";

const app = express();
const port = 3000;

app.get('/api/v1/userid/:auth_id', async (req, res) => {
	const { auth_id } = req.params;
	try {
		const user = await prisma.users.findUnique({
			where: { auth_id: parseInt(auth_id, 10) },
		});
		if (!user) return res.status(404).json({ error: "not find" });
		res.json({ user_id: user.user_id });
	} catch (e) {
		res.status(500).json({ error: "internal error" });
	}
});

app.get('/api/v1/user/:user_id', async (req, res) => {
	const { user_id } = req.params;
	try {
		const user = await prisma.users.findUnique({
			where: { user_id: parseInt(user_id, 10) },
		});
		if (!user) return res.status(404).json({ error: "not find" });
		res.json(user);
	} catch (e) {
		return res.status(500).json({ error: "internal error" });
	}
});

app.listen(port, () => {
	console.log(`listening on port ${port}`);
});

import express from 'express';
import { prisma, Prisma } from "./lib/prisma.js";
import { role_type } from './generated/prisma/enums.js';
import { json } from 'node:stream/consumers';

const app = express();
const port = 3000;
 app.use(express.json());

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

app.post('/svc-user/profile/:auth_id', async (req, res) => {
    console.log("in post new user\n");
    //validate permissions ? technically no access tokens in the request
    try {
        console.log("create new user in db\n");
        const authId = parseInt(req.params.auth_id as string);
        console.log("after const authid\n");
        if (isNaN(authId)) {
            console.log("isNaN\n");
            return res.status(400).json({ error: "Invalid auth_id" });
        }
        console.log(`authId valid, checking role: ${req.body.role_type}\n`);
        const role: role_type = req.body.role_type;
        if (role !== 'recruiter' && role !== 'candidate' && role !== 'admin')
            return res.status(400).json({error: "Invalid role type"});
        console.log("role_type validated\n");
        const newUser = await prisma.users.create({
            data: {
                auth_id: authId,
                role: role as role_type,
                email: req.body.email,
                firstname: req.body.name,
                lastname: req.body.surname,
            },
        });
        console.log("user created in db\n");
        return res.status(201).json({userId: newUser.user_id, message: "User created"});
    } catch (error) { //gigachad catch path made by papa claude cuz i was tired as hell
    console.error("new user error path:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // e.g. P2002 = unique constraint (duplicate email/auth_id)
        if (error.code === 'P2002') {
            return res.status(409).json({ error: "User already exists" });
        }
        return res.status(400).json({ error: "Database constraint violation", code: error.code });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        // Schema mismatch — e.g. passing a string where Prisma expects an int
        return res.status(400).json({ error: "Invalid data shape" });
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        // Can't connect to DB
        return res.status(503).json({ error: "Database unavailable" });
    }

    // Catch-all: always have this as your last line
    return res.status(500).json({ error: "Internal server error" });
    }
})

app.listen(port, () => {
	console.log(`listening on port ${port}`);
});
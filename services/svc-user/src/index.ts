import express, { Request, Response } from 'express';
import { prisma, Prisma } from "./lib/prisma.js";
import { role_type } from './generated/prisma/enums.js';
import { string, z } from 'zod';

const nameSurnameSchema = z.string()
                        .min(1, {error: "Name or surname field too short", abort: true})
                        .max(64, {error: "Name or surname too long", abort: true});

const NewUser = z.object({
    email: z.email({error: "Wrong email format", abort: true}),
    name: nameSurnameSchema,
    surname: nameSurnameSchema,
    role_type: z.string(),
})


const app = express();
const port = 3000;

app.set("query parser", "extended")
app.use(express.json());

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

app.post('/svc-user/profile/:auth_id', async (req, res) => {
    console.log("in post new user\n");
    console.log(req.body);
    const newUserParse = NewUser.safeParse(req.body)
    if (!newUserParse.success)
        return res.status(400).json({error: newUserParse.error})
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

app.get('/user/:userId/connections', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const id = parseInt(req.query.userId as string);
    const permissions = req.query.permissions as string[];
    console.log(`userId=${userId} id=${id} permissions=${permissions}`);
    if ((!permissions?.includes("readConnection") && !permissions?.includes("manageConnection"))
        || (permissions?.includes("readConnection") && id != userId)) {
        return res.status(403).json({error: "No permissions for this actions"});
    }
    try {
        const connections = await prisma.connections.findMany({
            where: {
                OR: [
                    { candidate_id: userId },
                    { recruiter_id: userId },
                ],
                status: 'accepted',
            },
            select: {
                // When this user is the candidate, select the recruiter's info
                users_connections_recruiter_idTousers: {
                    select: {
                        user_id: true,
                        firstname: true,
                        lastname: true,
                        profile_pic_url: true,
                        job_title: true,
                    },
                },
                // When this user is the recruiter, select the candidate's info
                users_connections_candidate_idTousers: {
                    select: {
                        user_id: true,
                        firstname: true,
                        lastname: true,
                        profile_pic_url: true,
                        job_title: true,
                    },
                },
            },
        });
        const connectedUsers = connections.map((conn) => {
            const recruiterSide = conn.users_connections_recruiter_idTousers;
            const candidateSide = conn.users_connections_candidate_idTousers;
            return recruiterSide?.user_id !== userId ? recruiterSide : candidateSide;
        });
        console.log(connectedUsers);
        res.status(200).json({connections: connectedUsers, message: "Connections found"});
    } catch(error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res.status(400).json({ error: "No connections found", code: error.code });
        }
        return res.status(500).json({error: "Bad gateway in svc-user get/connections"});
    }
});

app.listen(port, () => {
	console.log(`listening on port ${port}`);
});
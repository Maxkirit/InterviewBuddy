
import express from 'express';
import { prisma, Prisma } from "./lib/prisma.js";
import { gender_type } from './generated/prisma/enums.js';
import { role_type } from './generated/prisma/enums.js';
import { string, z } from 'zod';
import { error } from 'node:console';

const nameSurnameSchema = z.string()
                        .min(1, {error: "Name or surname field too short", abort: true})
                        .max(64, {error: "Name or surname too long", abort: true});

const NewUser = z.object({
    email: z.email({error: "Wrong email format", abort: true}),
    password: z.string(),
    name: nameSurnameSchema,
    surname: nameSurnameSchema,
    role_type: z.enum('candidate', 'recruiter', 'admin'),
})

const GenderType = z.enum('male', 'female', 'non_binary', 'prefer_not_to_say');

const DateOfBirth = z.string()
                    .length(10, {error: "Date not right length", abort: true})
                    .z.coerce.date({error: "Invalid date format", abort: true});

const CountryJobOrg = z.string()
                .min(1, {error: "Field too short", abort: true})
                .max(64, {error: "Field too long", abort: true});

const Bio = z.string()
            .min(1, {error: "Bio too short", abort: true})
            .max(1000, {error: "Bio too long", abort: true});

const LinkedinLink = z.url({
    protocol: /^https?$/,
    hostname: /^linkedin\.com$/
}, {error: "Not a linkedin link", abort: true});

const Phone = z.e164({error: "Invalid phone number", abort: true});

const app = express();
const port = 3000;
 app.use(express.json());

app.get('/user/userid/:auth_id', async (req, res) => {
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

app.post('/user/profile/:auth_id', async (req, res) => {
    console.log("in post new user\n");
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
        return res.status(503).json({ error: "Database unavailable" });
    }

    // Catch-all: always have this as your last line
    return res.status(500).json({ error: "Internal server error" });
    }
})

app.patch('/user/profile/:user_id', async (req, res) => {
    const FIELDS = [
        'gender', 'date_of_birth', 'country', 'job_title',
        'organization', 'bio', 'linkedin_link', 'phone_number'
    ] as const;

    const validators = new Map<string, any>([['gender', GenderType], ['date_of_birth', DateOfBirth],
                            ['bio', Bio], ['linkedin_link', LinkedinLink], ['organization', CountryJobOrg],
                            ['job_title', CountryJobOrg], ['organisation', CountryJobOrg]]);
    
    let userUpdate: any;
    for (let field in FIELDS) {
        if (req.body[field] !== "") {
            const parsedField = validators.get(field).safeParse(req.body[field]);
            if (!parsedField.success)
                return res.status(400).json({error: parsedField.error});
        }
        userUpdate.field = req.body[field];
    }

    const userId = parseInt(req.params.user_id);
    try {
        const updatedUser = await prisma.users.update({
            where: {user_id: userId},
            data: userUpdate,
        });
        return res.status(201).json({error: "User succesfully updated"});
    } catch (error) {
        if (error instanceof Prisma.PrismaClientInitializationError)
            return res.status(503).json({ error: "Database unavailable" });
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return res.status(404).json({error: "User not found"});
            }
            return res.status(502).json({error: error.message});
        }
        return res.status(500).json({error: "Bad gateway (svc-user)"});
    }
})

app.get('/user/connection-check/:recruiter_id/:candidate_id', async(req, res) => {
    const [parsedRecId, parsedCanId] = [parseInt(req.params.recruiter_id), parseInt(req.params.candidate_id)];
    if (parsedCanId <= 0 || parsedRecId <= 0)
        return res.status(400);
    try {
        const validate = await prisma.connections.findUniqueOrThrow({
            where: {
                recruiter_id_candidate_id: {recruiter_id: parsedRecId, candidate_id: parsedCanId},
            },
        })
        return res.status(200);
    } catch (error) {
        return res.status(403);
    }
})

app.listen(port, () => {
	console.log(`listening on port ${port}`);
});

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
    name: nameSurnameSchema,
    surname: nameSurnameSchema,
    role_type: z.enum(['candidate', 'recruiter', 'admin']),
})

const GenderTypeSchema = z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']);

const DateOfBirthSchema = z.union([
                    z.string().max(0), 
                    z.string()
                    .length(10, {error: "Date not right length", abort: true})
                    .pipe(z.coerce.date({error: "Invalid date format"}))]);

const CountryJobOrgSchema = z.string()
                .min(1, {error: "Field too short", abort: true})
                .max(64, {error: "Field too long", abort: true});

const BioSchema = z.string()
            .min(1, {error: "Bio too short", abort: true})
            .max(1000, {error: "Bio too long", abort: true});

const LinkedinLinkSchema = z
  .string()
  .refine(
    (url) => /^https?:\/\/(www\.)?linkedin\.com\//i.test(url),
    { message: "Not a LinkedIn link" }
  );

const PhoneSchema = z.e164({error: "Invalid phone number", abort: true});

const ProfileUpdateSchema = z.object({
    gender: GenderTypeSchema,
    dateOfBirth: DateOfBirthSchema,
    country: CountryJobOrgSchema,
    jobTitle: CountryJobOrgSchema,
    organization: CountryJobOrgSchema,
    bio: BioSchema,
    linkedinLink: LinkedinLinkSchema,
    phoneNumber: PhoneSchema,
})

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
        return res.status(503).json({ error: "Database unavailable" });
    }

    // Catch-all: always have this as your last line
    return res.status(500).json({ error: "Internal server error" });
    }
})

app.patch('/user/profile/:user_id', async (req, res) => {
    console.log("in update user profile route\n");
    try {
        //validate perms
        const userId = parseInt(req.params.user_id);
        if ((!req.body.permissions.includes("modifyOwnUser") && !req.body.permissions.includes("manageUserInfo")) || 
                (req.body.permissions.includes("modifyOwnUser") && req.body.userId !== userId)){
            return res.status(403).json({error: "Wrong permissions for route"});
        }
        console.log("permissions validated\n");
        //validate input
        const userUpdate = ProfileUpdateSchema.safeParse(req.body.body);
        if (!userUpdate.success)
            return res.status(400).json({error: userUpdate.error});
        console.log("parsing validated\n");
        //update db
        const updatedUser = await prisma.users.update({
            where: {user_id: userId},
            data: userUpdate,
        });
        console.log("db updated\n");
        return res.status(201).json({error: "User succesfully updated"});
    } catch (error) {
        console.log("in error path\n");
        if (error instanceof Prisma.PrismaClientInitializationError)
            return res.status(503).json({ error: "Database unavailable" });
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return res.status(404).json({error: "User not found"});
            }
            return res.status(502).json({error: error.message});
        }
        return res.status(502).json({error: "Bad gateway (svc-user)"});
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
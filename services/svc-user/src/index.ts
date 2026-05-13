import express, { Request, Response } from "express";
import { prisma, Prisma } from "./lib/prisma.js";
import { gender_type } from './generated/prisma/enums.js';
import { role_type } from './generated/prisma/enums.js';
import { string, z } from 'zod';
import sharp from 'sharp';
import { randomBytes } from "node:crypto";
import { error, profile } from 'node:console';
import { resolveSoa } from 'node:dns';
import { addConnection } from "./connections/addConnection.js";
import { read } from "node:fs";

const nameSurnameSchema = z
    .string()
    .min(1, { error: "Name or surname field too short", abort: true })
    .max(64, { error: "Name or surname too long", abort: true });

const NewUser = z.object({
    email: z.email({ error: "Wrong email format", abort: true }),
    name: nameSurnameSchema,
    surname: nameSurnameSchema,
    role_type: z.enum(["candidate", "recruiter", "admin"]),
});

const GenderTypeSchema = z.union([
    z.enum(["male", "female", "non_binary", "prefer_not_to_say"]),
    z.string().max(0),
]);

const DateOfBirthSchema = z.union([
    z.string().max(0),
    z
        .string()
        .length(10, { error: "Date not right length" })
        .pipe(z.coerce.date({ error: "Invalid date format" })),
]);

const CountryJobOrgSchema = z.union([
    z
        .string()
        .min(1, { error: "Field too short" })
        .max(64, { error: "Field too long" }),
    z.string().max(0),
]);

const BioSchema = z.union([
    z
        .string()
        .min(1, { error: "Bio too short" })
        .max(1000, { error: "Bio too long" }),
    z.string().max(0),
]);

const LinkedinLinkSchema = z.union([
    z
        .string()
        .refine((url) => /^https?:\/\/(www\.)?linkedin\.com\//i.test(url), {
            message: "Not a LinkedIn link",
        }),
    z.string().max(0),
]);

const PhoneSchema = z.union([
    z.e164({ error: "Invalid phone number" }),
    z.string().max(0),
]);

const ProfileUpdateSchema = z.object({
    gender: GenderTypeSchema,
    date_of_birth: DateOfBirthSchema,
    country: CountryJobOrgSchema,
    job_title: CountryJobOrgSchema,
    organization: CountryJobOrgSchema,
    bio: BioSchema,
    linkedin_link: LinkedinLinkSchema,
    phone_number: PhoneSchema,
});

const app = express();
const port = 3000;

app.set("query parser", "extended");
app.use(express.json());

app.get("/user/userid/:auth_id", async (req, res) => {
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

app.get("/user/:user_id/public", async (req, res) => {
    const { user_id } = req.params;
    const token_id = req.query.token_id as string;
    const tmp = req.query.perm ?? {};
    const permission = Object.values(tmp) as string[];

    console.log(
        `start on route user get unser info perm : ${permission} token : ${token_id}, user_id: ${user_id}`,
    );
    if (user_id === "all") {
        console.log("try to return all db to an admin");
        if (!permission?.includes("manageUserInfo")) {
            return res.status(403).json({ error: "Forbidden" });
        }
        try {
            console.log("admin perm okay...");
            const user = await prisma.users.findMany();
            return res.status(200).json(user);
        } catch (e) {
            return res.status(500).json({ error: "Internal error" });
        }
    }
    if (!permission?.includes("readUserInfo"))
        return res.status(403).json({ error: "forbiden" });
    console.log("access authorized for read user info");
    console.log("user_id:", user_id);
    console.log("token_id:", token_id);
    console.log("permissions:", permission);
    try {
        const user = await prisma.users.findUnique({
            where: { user_id: parseInt(user_id as string, 10) },
            select: {
                firstname: true,
                lastname: true,
                profile_pic_url: true,
                gender: true,
                date_of_birth: true,
                country: true,
                job_title: true,
                organization: true,
                bio: true,
                linkedin_link: true,
            },
        });
        if (!user) return res.status(404).json({ error: "not find" });
        res.json(user);
    } catch (e) {
        return res.status(500).json({ error: "internal error" });
    }
});

app.get("/user/:user_id", async (req, res) => {
    const { user_id } = req.params;
    const token_id = req.query.token_id as string;
    const tmp = req.query.perm ?? {};
    const permission = Object.values(tmp) as string[];

    console.log(
        `start on route user get unser info perm : ${permission} token : ${token_id}, user_id: ${user_id}`,
    );
    if (user_id === "all") {
        console.log("try to return all db to an admin");
        if (!permission?.includes("manageUserInfo")) {
            return res.status(403).json({ error: "Forbidden" });
        }
        try {
            console.log("admin perm okay...");
            const user = await prisma.users.findMany({ orderBy: { user_id: 'asc' } });
            return res.status(200).json(user);
        } catch (e) {
            return res.status(500).json({ error: "Internal error" });
        }
    }
    if (user_id !== token_id || !permission?.includes("readUserInfo"))
        return res.status(403).json({ error: "forbiden" });
    console.log("access authorized for read user info");
    console.log("user_id:", user_id);
    console.log("token_id:", token_id);
    console.log("permissions:", permission);
    try {
        const user = await prisma.users.findUnique({
            where: { user_id: parseInt(user_id as string, 10) },
        });
        if (!user) return res.status(404).json({ error: "not find" });
        res.json(user);
    } catch (e) {
        return res.status(500).json({ error: "internal error" });
    }
});

app.post("/user/profile/:auth_id", async (req, res) => {
    console.log("in post new user\n");
    console.log(req.body);
    const newUserParse = NewUser.safeParse(req.body);
    if (!newUserParse.success)
        return res.status(400).json({ error: newUserParse.error });
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
        if (role !== "recruiter" && role !== "candidate" && role !== "admin")
            return res.status(400).json({ error: "Invalid role type" });
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
        return res
            .status(201)
            .json({ userId: newUser.user_id, message: "User created" });
    } catch (error) {
        //gigachad catch path made by papa claude cuz i was tired as hell
        console.error("new user error path:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // e.g. P2002 = unique constraint (duplicate email/auth_id)
            if (error.code === "P2002") {
                return res.status(409).json({ error: "User already exists" });
            }
            return res.status(400).json({
                error: "Database constraint violation",
                code: error.code,
            });
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
});

app.get("/user/:userId/connections", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const id = parseInt(req.query.userId as string);
    const tmp = req.query.permissions ?? {};
    const permissions = Object.values(tmp) as string[];

    console.log(`userId=${userId} id=${id} permissions=${permissions}`);
    if (
        (!permissions?.includes("readConnection") &&
            !permissions?.includes("manageConnection")) ||
        (permissions?.includes("readConnection") && id != userId)
    ) {
        return res
            .status(403)
            .json({ error: "No permissions for this actions" });
    }
    try {
        const connections = await prisma.connections.findMany({
            where: {
                OR: [{ candidate_id: userId }, { recruiter_id: userId }],
                status: "accepted",
            },
            select: {
                // When this user is the candidate, select the recruiter's info
                users_connections_recruiter_idTousers: {
                    select: {
                        user_id: true,
                        firstname: true,
                        lastname: true,
                        profile_pic_url: true,
                        organization: true,
                    },
                },
                // When this user is the recruiter, select the candidate's info
                users_connections_candidate_idTousers: {
                    select: {
                        user_id: true,
                        firstname: true,
                        lastname: true,
                        profile_pic_url: true,
                    },
                },
            },
        });
        const connectedUsers = connections.map((conn) => {
            const recruiterSide = conn.users_connections_recruiter_idTousers;
            const candidateSide = conn.users_connections_candidate_idTousers;
            return recruiterSide?.user_id !== userId
                ? recruiterSide
                : candidateSide;
        });
        console.log(connectedUsers);
        res.status(200).json({
            connections: connectedUsers,
            message: "Connections found",
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return res
                .status(400)
                .json({ error: "No connections found", code: error.code });
        }
        return res
            .status(500)
            .json({ error: "Bad gateway in svc-user get/connections" });
    }
});

app.patch("/user/profile/:user_id", async (req, res) => {
    console.log("in update user profile route\n");
    try {
		console.log(req.body.permissions);
        const userId = parseInt(req.params.user_id);
        if (
            ( req.body.userId !== userId &&
                !req.body.permissions?.includes("manageUserInfo")) ||
            !req.body.permissions.includes("modifyOwnUser")
        ) {
			console.log(`${req.body.userId} vs ${userId}, perm : mdu ${req.body.permissions?.includes("modifyOwnUser")}, mui ${req.body.permissions?.includes("manageUserInfo")}`)
            return res
                .status(403)
                .json({ error: "Wrong permissions for route" });
        }
        console.log("permissions validated\n");
        console.log(req.body.body);
        //validate input
        const userUpdate = ProfileUpdateSchema.safeParse(req.body.body);
        if (!userUpdate.success)
            return res.status(400).json({ error: userUpdate.error }); //propgate wrong field properly
        console.log("parsing validated\n");
        //update db
        const updatedUser = await prisma.users.update({
            where: { user_id: userId },
            data: {
                gender:
                    req.body.body.gender === "" ? null : req.body.body.gender,
                date_of_birth:
                    req.body.body.date_of_birth === ""
                        ? null
                        : req.body.body.date_of_birth,
                country:
                    req.body.body.country === "" ? null : req.body.body.country,
                job_title:
                    req.body.body.job_title === ""
                        ? null
                        : req.body.body.job_title,
                organization:
                    req.body.body.organization === ""
                        ? null
                        : req.body.body.organization,
                bio: req.body.body.bio === "" ? null : req.body.body.bio,
                linkedin_link:
                    req.body.body.linkedin_link === ""
                        ? null
                        : req.body.body.linkedin_link,
                phone_number:
                    req.body.body.phone_number === ""
                        ? null
                        : req.body.body.phone_number,
            },
        });
        console.log("db updated\n");
        return res.status(201).json({ error: "User succesfully updated" });
    } catch (error) {
        console.log("in error path\n");
        if (error instanceof Prisma.PrismaClientInitializationError)
            return res.status(503).json({ error: "Database unavailable" });
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                return res.status(404).json({ error: "User not found" });
            }
            return res.status(502).json({ error: error.message });
        }
        console.log(error);
        return res.status(502).json({ error: "Bad gateway (svc-user)" });
    }
});

app.get(
    "/user/connection-check/:recruiter_id/:candidate_id",
    async (req, res) => {
        const [parsedRecId, parsedCanId] = [
            parseInt(req.params.recruiter_id),
            parseInt(req.params.candidate_id),
        ];
        if (parsedCanId <= 0 || parsedRecId <= 0) return res.status(400).json({ error: "Invalid IDs" });
        try {
            console.log(`rec: ${parsedRecId} can: ${parsedCanId}`);
            const validate = await prisma.connections.findUniqueOrThrow({
                where: {
                    recruiter_id_candidate_id: {
                        recruiter_id: parsedRecId,
                        candidate_id: parsedCanId,
                    },
                },
            });
            console.log("connection found");
            return res.status(200).json({message: "connection found"});
        } catch (error) {
            return res.status(403).json({ error: "Connection not found" });
        }
    },
);

app.post("/user/:user_id/connections/:link_id", addConnection);

app.put('/user/:userId/avatar', async(req, res) => {
    //check perm for admin and self
    const userId = parseInt(req.params.userId) ?? null;
    if (!userId)
        return res.status(400).json({error: "invalid userId in request params"});
    if ((!req.body.permissions.includes("modifyOwnUser") && !req.body.permissions.includes("manageUserInfo")) ||
            (req.body.permissions.includes("modifyOwnUser") && userId !== req.body.userId)) {
                return res.status(403).json({error: "Permissions denied on PUT /user/:userId/avatar"});
            }
    console.log("permissions validated");

    const filename = `${req.params.userId}_${randomBytes(16).toString('hex')}`;
    // const filesystemLocation = `/var/www/avatars/${filename}`; //comment out and replace with filename in file below if you want it local
    console.log(filename);
    try {
        //this calls writes directly to filesystem
        const file = await sharp(Buffer.from(req.body.imageContent, 'base64')).toFile(filename); //Buffer.from() interprets buffer as base64 encoding
    } catch (error) {
        return res.status(400).json({error: "Bad image sent"});
    }
    try {
        const update = await prisma.users.update({
            where: {user_id: userId},
            data: {
                profile_pic_url: filename, //replace with filesystemLocation
            }
        });
        return res.status(201).json({message: "Avatar uploaded successfully"});
    } catch (error) {
        console.log("in error path\n");
        console.log(error);
        if (error instanceof Prisma.PrismaClientInitializationError)
            return res.status(503).json({ error: "Database unavailable" });
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return res.status(404).json({error: "User not found"});
            }
            return res.status(502).json({error: error.message});
        }
        console.log(error);
        return res.status(502).json({error: "Bad gateway (svc-user)"});
    }
})

app.get('/user/:userId/avatar', async(req, res) => {
    const userId = req.query.userId as string; //user_id of who makes the request
    const tmp = req.query.permissions ?? {};
    const permission = Object.values(tmp) as string[];
    console.log(`query param userID: ${userId}\npath parameter userID: ${req.params.userId}`);
    //admin only
    if (userId === "all"){
        console.log("in admin fetch all path")
        if (!permission.includes("manageUserInfo"))
            return res.status(403).json({error: "Permissions denied"});
        try {
            const urls = await prisma.users.findMany({
                select: {profile_pic_url: true},
            });
            return res.status(200).json(urls);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientInitializationError)
                return res.status(503).json({ error: "Database unavailable" });
            return res.status(502).json({error: "Bad gateway (svc-user)"});
        }        
    }

    //fetch one by one
    console.log(tmp);
    console.log(permission);
    if ((!permission.includes("readUserInfo") && !permission.includes("manageUserInfo")) ||
            (permission.includes("readUserInfo") && userId !== req.params.userId)) {
                return res.status(403).json({error: "Permissions denied on GET /user/:userId/avatar"});
            }
    console.log("permission validated");
    const targetId = parseInt(req.params.userId) ?? null;
    if (!targetId)
            return res.status(400).json({error: "Invalid target userId"});
    try {
        const url = await prisma.users.findUnique({
            where: {user_id: targetId},
            select: {profile_pic_url: true},
        });
        return res.status(200).json({data: url});
    } catch (error) {
        console.log("in error path\n");
        console.log(error);
        if (error instanceof Prisma.PrismaClientInitializationError)
            return res.status(503).json({ error: "Database unavailable" });
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return res.status(404).json({error: "User not found"});
            }
            return res.status(502).json({error: error.message});
        }
        console.log(error);
        return res.status(502).json({error: "Bad gateway (svc-user)"});
    }
})

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});

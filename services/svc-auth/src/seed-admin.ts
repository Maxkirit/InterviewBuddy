import { readFileSync } from "fs";
import { prisma } from "./lib/prisma.js";
import argon2 from 'argon2';
import axios from 'axios';

type ApiError = { error: string };

//to change with Vault agents
const admin_email: string = readFileSync("/secrets/admin_email", "utf8").trim();
const admin_password: string = readFileSync("/secrets/admin_password", "utf8").trim();

let user = await prisma.auths.findUnique({
	where: { email: admin_email },
});
if (user !== null) {
	console.log("[seed-admin] Admin already exists");
	process.exit(0);
}

let hashedPwd: string;
try {
	console.log("[seed-admin] Hashing password...");
    hashedPwd = await argon2.hash(admin_password);
    console.log("[seed-admin] Password hashed");
} catch (error) {
	console.log("[seed-admin] FAILED: Hashing password");
	process.exit(1);
    
}
let newUser;
try{
	newUser = await prisma.auths.create({
		data: {
			sub: null,
			email: admin_email,
			hashed_password: hashedPwd,
		},
        });
        console.log("[seed-admin] Admin created in auth-db");
} catch (error){
        console.log("[seed-admin] FAILED: creation in auth-db");
		process.exit(1);
}

const TIMEOUT_MS = 60_000; // 1 minute
const start = Date.now();
let userId: number = -1;
while (1){
    try {
		if (Date.now() - start > TIMEOUT_MS) {
    		console.error("[seed-admin] FAILED: svc-user not reachable after 60s");
    		await prisma.auths.delete({ where: { auth_id: newUser.auth_id } });
			process.exit(1);
		}
        //will return user_id
        const response = await axios.post(`http://svc-user:3000/user/profile/${newUser.auth_id}`, {
            email: admin_email,
            name: 'Admin',
            surname: 'System',
            role_type: 'admin',
        });
		userId = response.data.userId;
        console.log("[seed-admin] admin created in user-db");
        break;
    } catch (error) {
        if (axios.isAxiosError<ApiError>(error) && error.response?.status) {
            console.log(error);
			await prisma.auths.delete({ where: { auth_id: newUser.auth_id } });
			process.exit(1);
		}
		console.log(`[seed-admin] Waiting for svc-user... timeout: ${Date.now() - start}/${TIMEOUT_MS}`);
		await new Promise(resolve => setTimeout(resolve, 2000)); //wait 2s before retry
	}
        
}

try {
	const permission = await prisma.roles.findUniqueOrThrow({
        where: {name: 'admin'},
    });
	const registerPermissions = await prisma.user_roles.create({
		data: {
			user_id: userId,
			role_id: permission.role_id,
			assigned_date: new Date(),
		},
	});

} catch (error) {
	console.error("[seed-admin] FAILED: assign admin role", error);
	await prisma.$disconnect();
	process.exit(1);
}

console.log("[seed-admin] DONE: Admin created!");
process.exit(0);

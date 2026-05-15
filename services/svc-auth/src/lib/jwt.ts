import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import { readFileSync } from 'fs';

const PRIVATE_KEY = readFileSync('/secrets/jwt_private.pem', 'utf-8');
const REFRESH_SECRET = readFileSync("/secrets/refresh_secret").toString("utf8").trim();
const REFRESH_MAX_AGE = 604800; //7 days in seconds === 604800

// will take permissions and userId as a parameter
export async function createAccessToken(userId: number) {
    // query auth-db for the users's permissions
    const userPerms = await prisma.user_roles.findUniqueOrThrow({
        where: {
            user_id: userId,
        },
        select: {
            roles: {
                select: {
                    name: true,
                    role_permissions: {
                        where: {
                            is_active: true,
                        },
                        select: {
                            permissions: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!userPerms) {
        return;
    }
    const role = userPerms.roles.name;
    console.log(role);
    const perms = userPerms.roles.role_permissions.flatMap((rp) =>
        rp.permissions ? [rp.permissions.name] : [],
    );
    const access_token = jwt.sign(
        { userId: userId, role: role, permissions: perms },
        PRIVATE_KEY,
        { algorithm: 'RS256', expiresIn: "10m" },
    );
    return access_token;
}

function createJti() {
    //shouldn't this be unique ????
    return randomBytes(16).toString("hex");
}

export async function createRefreshToken(userId: number) {
    const jti = createJti();
    const refresh_token = jwt.sign(
        { userId: userId, jti: jti },
        REFRESH_SECRET,
        { expiresIn: "7d" },
    ); //still possible to have a non unique key
    const refresh = await prisma.refresh_tokens.create({
        data: {
            token: refresh_token,
            jti: jti,
            user_id: userId,
        },
    });
    return {refreshToken: refresh_token, maxAge: REFRESH_MAX_AGE};
}

export async function rotateRefreshToken(oldJti: string, userId: number) {
    const updateUser = await prisma.refresh_tokens.update({
        where: { jti: oldJti },
        data: {
            updated_at: new Date(),
            revoked_at: new Date(),
        },
    });
    const newRefresh = await createRefreshToken(userId);
    const newAccess = await createAccessToken(userId);
    return {
        newRefresh: newRefresh.refreshToken,
        newAccess: newAccess,
        refreshMaxAge: newRefresh.maxAge,
    };
}

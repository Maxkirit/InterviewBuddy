import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { prisma } from "./prisma.js";

const ACCESS_SECRET = "changewhenvaultisup";
const REFRESH_SECRET = "changewhenvaultisup";

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
    const perms =  userPerms.roles.role_permissions.map(rp => rp.permissions.name);
    const access_token = jwt.sign({userId: userId, permissions: perms}, ACCESS_SECRET, {expiresIn: "10m"});
    return access_token;
}

function createJti() {
    return randomBytes(16).toString('hex');
}

export async function createRefreshToken(userId: number) {
    const jti = createJti();
    const refresh_token = jwt.sign({userId: userId, jti: jti}, REFRESH_SECRET, {expiresIn: "7d"});
    const refresh = await prisma.refresh_tokens.create({
        data: {
            token: refresh_token,
            jti: jti,
            user_id: userId,
        },
    });
    return refresh_token;
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
    const newAccess = createAccessToken(userId);
    return {newRefresh: newRefresh, newAccess: newAccess};
}
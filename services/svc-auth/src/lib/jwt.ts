import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { prisma } from "./prisma.js";

const ACCESS_SECRET = "changewhenvaultisup";
const REFRESH_SECRET = "changewhenvaultisup";

// will take permissions and userId as a parameter
export function createAccessToken() {
    const access_token = jwt.sign({}, ACCESS_SECRET, {expiresIn: "10m"});
    return access_token;
}

function createJti() {
    return randomBytes(16).toString('hex');
}

export function createRefreshToken(userId: number) {
    const jti = createJti();
    const refresh_token = jwt.sign({userId: userId, jti: jti}, REFRESH_SECRET, {expiresIn: "7d"});
    const refresh = prisma.refresh_tokens.create({
        data: {
            token: refresh_token,
            version_control: jti, // change version_control int to jti string
        },
    });
    return refresh_token;
}

export async function rotateRefreshToken(oldJti: string, userId: number) {
    const updateUser = await prisma.refresh_tokens.update({
        where: { version_control: oldJti },
        data: {
            updated_at: new Date(),
            // set revoked at
        },
    });
    const newRefresh = createRefreshToken(userId);
    return newRefresh;
}
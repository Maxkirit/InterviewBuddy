import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.trim() === "") {
  throw new Error("DATABASE_URL environment variable must be defined");
}

const connectionString = databaseUrl;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma, Prisma };
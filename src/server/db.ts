import "server-only";
import * as Prisma from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PrismaClient = (Prisma as any).PrismaClient as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForDb = globalThis as { prisma?: any };
export const db = globalForDb.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForDb.prisma = db;

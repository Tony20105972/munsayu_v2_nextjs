import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";

const COOKIE = "munsayu_session"; const DAY = 86_400_000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const hashPassword = (password: string) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; };
export const verifyPassword = (password: string, stored: string) => { const [salt, digest] = stored.split(":"); if (!salt || !digest) return false; return timingSafeEqual(Buffer.from(digest, "hex"), scryptSync(password, salt, 64)); };
export async function createSession(userId: string) { const token = randomBytes(32).toString("base64url"); await db.authSession.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * DAY) } }); const jar = await cookies(); jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 86400 }); }
export async function currentUser() { const token = (await cookies()).get(COOKIE)?.value; if (!token) return null; const session = await db.authSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } }); if (!session || session.expiresAt < new Date() || session.user.status !== "ACTIVE") return null; return session.user; }
export async function requireAdmin() { const user = await currentUser(); if (!user) throw new AuthError(401); if (user.role !== "ADMIN") throw new AuthError(403); return user; }
export class AuthError extends Error { constructor(public status: 401 | 403) { super("UNAUTHORIZED"); } }
export async function destroySession() { const token = (await cookies()).get(COOKIE)?.value; if (token) await db.authSession.deleteMany({ where: { tokenHash: hashToken(token) } }); (await cookies()).delete(COOKIE); }

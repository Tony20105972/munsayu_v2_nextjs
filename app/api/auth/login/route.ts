import { z } from "zod";
import { db } from "@/server/db";
import { createSession, verifyPassword } from "@/server/auth";
import { invalidResponse, jsonError } from "@/server/http";
const schema = z.object({ loginId: z.string().min(1), password: z.string().min(1) });
const attempts = new Map<string, { count: number; resetAt: number }>();
export async function POST(request: Request) { try { const input = schema.parse(await request.json()); const bucket = attempts.get(input.loginId); if (bucket && bucket.resetAt > Date.now() && bucket.count >= 5) return jsonError(429, "RATE_LIMITED"); const user = await db.user.findUnique({ where: { loginId: input.loginId } }); if (!user || user.status !== "ACTIVE" || !verifyPassword(input.password, user.passwordHash)) { attempts.set(input.loginId, { count: (bucket?.count ?? 0) + 1, resetAt: Date.now() + 15 * 60_000 }); return jsonError(401, "INVALID_CREDENTIALS"); } attempts.delete(input.loginId); await createSession(user.id); return Response.json({ id: user.id, role: user.role }, { headers: { "Cache-Control": "no-store" } }); } catch (e) { return invalidResponse(e); } }

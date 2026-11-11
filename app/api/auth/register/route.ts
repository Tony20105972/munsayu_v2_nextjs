import { z } from "zod";
import { db } from "@/server/db";
import { createSession, hashPassword } from "@/server/auth";
import { invalidResponse, jsonError } from "@/server/http";
const schema = z.object({ loginId: z.string().min(4).max(40), password: z.string().min(10).max(128), name: z.string().min(1).max(80), email: z.string().email(), phone: z.string().min(9).max(20) });
export async function POST(request: Request) { try { const input = schema.parse(await request.json()); const user = await db.user.create({ data: { ...input, passwordHash: hashPassword(input.password) } }); await createSession(user.id); return Response.json({ id: user.id }, { status: 201, headers: { "Cache-Control": "no-store" } }); } catch (e: unknown) { const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined; return code === "P2002" ? jsonError(409, "ACCOUNT_EXISTS") : invalidResponse(e); } }

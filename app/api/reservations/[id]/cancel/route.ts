import { z } from "zod";
import { db } from "@/server/db";
import { invalidResponse, jsonError } from "@/server/http";
const input = z.object({ name: z.string().min(1), guardianPhone: z.string().min(9).max(20) });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const data = input.parse(await request.json()); const { id } = await context.params; const r = await db.eventReservation.findFirst({ where: { id, name: data.name, phone: data.guardianPhone } }); if (!r) return jsonError(404, "NOT_FOUND"); await db.eventReservation.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } }); return Response.json({ id, status: "CANCELLED" }, { headers: { "Cache-Control": "no-store" } }); } catch (e) { return invalidResponse(e); } }

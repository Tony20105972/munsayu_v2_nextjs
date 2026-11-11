import { z } from "zod";
import { db } from "@/server/db";
import { invalidResponse, jsonError } from "@/server/http";
const input = z.object({ reservationId: z.string().min(1), name: z.string().min(1), guardianPhone: z.string().min(9).max(20) });
export async function POST(request: Request) { try { const data = input.parse(await request.json()); const r = await db.eventReservation.findFirst({ where: { id: data.reservationId, name: data.name, phone: data.guardianPhone }, include: { event: { select: { title: true, startsAt: true } } } }); if (!r) return jsonError(404, "NOT_FOUND"); return Response.json({ id: r.id, status: r.status, event: r.event, attendeeCount: r.attendeeCount }, { headers: { "Cache-Control": "no-store" } }); } catch (e) { return invalidResponse(e); } }

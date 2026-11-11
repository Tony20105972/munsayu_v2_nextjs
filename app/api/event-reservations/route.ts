import { eventReservationSchema } from "@/lib/contracts";
import { ClosedIntakeError, createEventReservation } from "@/server/services/applications";
import { invalidResponse, jsonError } from "@/server/http";
export async function POST(request: Request) { try { const result = await createEventReservation(eventReservationSchema.parse(await request.json())); return Response.json({ id: result.record.id, status: result.record.status }, { status: result.replayed ? 200 : 201, headers: { "Cache-Control": "no-store" } }); } catch (e) { return e instanceof ClosedIntakeError ? jsonError(409, "INTAKE_CLOSED") : invalidResponse(e); } }

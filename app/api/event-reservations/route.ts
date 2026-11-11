import { eventReservationSchema } from "@/lib/contracts";
import { createEventReservation } from "@/server/services/event-reservations";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

/** FM-002 설명회 예약. 참석 인원은 1~2명이고 마감 상태면 409다. */
export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "event-reservations");
    const input = await parseJsonBody(request, eventReservationSchema);
    const result = await createEventReservation(input);
    return jsonNoStore(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

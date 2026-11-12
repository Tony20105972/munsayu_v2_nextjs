import { reservationLookupSchema } from "@/lib/contracts";
import { lookupReservations } from "@/server/services/reservations";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

/** PG-011 예약 조회. 강좌 신청과 설명회 예약을 함께 목록으로 돌려준다. (ASM-013) */
export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "reservations-lookup");
    const input = await parseJsonBody(request, reservationLookupSchema);
    const result = await lookupReservations(input);
    return jsonNoStore(result, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

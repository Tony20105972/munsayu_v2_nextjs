import { reservationCancelSchema } from "@/lib/contracts";
import { notFound } from "@/server/errors";
import { cancelReservation } from "@/server/services/reservations";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

/** PG-011 예약 건별 취소. 본인 확인 정보가 맞지 않으면 타인 건도 똑같이 404다. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    enforceRateLimit(request, "reservations-cancel");
    const { id } = await context.params;
    const input = await parseJsonBody(request, reservationCancelSchema);
    if (input.reservationId !== id) {
      throw notFound();
    }
    const result = await cancelReservation(input);
    return jsonNoStore(result, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

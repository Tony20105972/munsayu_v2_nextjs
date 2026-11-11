import { requireAdmin } from "@/server/auth";
import { getEventReservationTotals } from "@/server/services/applications-admin";
import { errorResponse, jsonNoStore } from "@/server/http";

/** AD-005 예약 건수와 참석 인원 합계를 따로 센다. (EV-ADM-03) */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    return jsonNoStore(await getEventReservationTotals(id), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

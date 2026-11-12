import { eventStatusChangeSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { changeEventStatus } from "@/server/services/events";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-004 / BZ-001 설명회 상태 수동 변경. 자동 전환은 없다. (ASM-001) */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseJsonBody(request, eventStatusChangeSchema);
    const event = await changeEventStatus(input);
    return jsonNoStore({ id: event.id, statusOptionId: event.statusOptionId }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

import { eventUpsertSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { deleteEvent, updateEvent } from "@/server/services/events";
import { emptyNoStore, errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-003 설명회 수정. 관리코드도 여기서 고친다. (ASM-005) */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const input = await parseJsonBody(request, eventUpsertSchema);
    const event = await updateEvent(id, input);
    return jsonNoStore({ id: event.id, managementCode: event.managementCode }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

/** AD-003 설명회 삭제. 예약 기록이 있으면 409로 막는다. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    await deleteEvent(id);
    return emptyNoStore(204);
  } catch (error) {
    return errorResponse(error);
  }
}

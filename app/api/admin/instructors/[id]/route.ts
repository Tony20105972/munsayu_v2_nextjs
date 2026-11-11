import { instructorUpsertSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { deleteInstructor, updateInstructor } from "@/server/services/instructors";
import { emptyNoStore, errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-006 강사 수정. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const input = await parseJsonBody(request, instructorUpsertSchema);
    const instructor = await updateInstructor(id, input);
    return jsonNoStore({ id: instructor.id }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

/** AD-006 강사 삭제. 팀 소속도 함께 지워진다. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    await deleteInstructor(id);
    return emptyNoStore(204);
  } catch (error) {
    return errorResponse(error);
  }
}

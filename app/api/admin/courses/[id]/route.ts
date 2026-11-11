import { courseUpsertSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { deleteCourse, updateCourse } from "@/server/services/courses";
import { emptyNoStore, errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-007 강좌 수정. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const input = await parseJsonBody(request, courseUpsertSchema);
    const course = await updateCourse(id, input);
    return jsonNoStore({ id: course.id }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

/** AD-007 강좌 삭제. 신청 기록이 있으면 409로 막는다. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    await deleteCourse(id);
    return emptyNoStore(204);
  } catch (error) {
    return errorResponse(error);
  }
}

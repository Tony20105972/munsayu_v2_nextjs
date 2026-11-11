import { requireAdmin } from "@/server/auth";
import { deleteAdminAccount } from "@/server/services/members";
import { errorResponse, jsonNoStore } from "@/server/http";

/**
 * AD-002 관리자 계정 삭제. 기록을 남긴다.
 * 마지막 관리자 계정은 409로 막고, 자기 계정 삭제는 403으로 막는다.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    await deleteAdminAccount(admin.id, { userId: id });
    return jsonNoStore({ id, deleted: true }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

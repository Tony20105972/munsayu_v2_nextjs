import { requireAdmin } from "@/server/auth";
import { deleteAdminAccount } from "@/server/services/members";
import { emptyNoStore, errorResponse } from "@/server/http";

/** AD-002 관리자 계정 삭제. 자기 계정은 지울 수 없고 기록을 남긴다. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    await deleteAdminAccount(admin.id, { userId: id });
    return emptyNoStore(204);
  } catch (error) {
    return errorResponse(error);
  }
}

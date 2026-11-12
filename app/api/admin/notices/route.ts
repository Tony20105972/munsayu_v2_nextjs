import { noticeAdminListSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { listAdminNotices } from "@/server/services/notices-admin";
import { errorResponse, jsonNoStore, parseSearchParams } from "@/server/http";

/** AD-014 공지 목록 (임시 저장 글 포함). 관리자만 볼 수 있다. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const filter = parseSearchParams(request, noticeAdminListSchema);
    return jsonNoStore(await listAdminNotices(filter), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

import { adminAccountCreateSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { createAdminAccount } from "@/server/services/members";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-002 관리자 계정 추가. 단일 ADMIN 역할이고 기록을 남긴다. (D5) */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const input = await parseJsonBody(request, adminAccountCreateSchema);
    return jsonNoStore(await createAdminAccount(admin.id, input), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

import { applicationFilterSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { listApplications } from "@/server/services/applications-admin";
import { errorResponse, jsonNoStore, parseSearchParams } from "@/server/http";

/** AD-005 / AD-008 신청·예약 목록 (마스킹). 매 요청 권한을 확인한다. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const filter = parseSearchParams(request, applicationFilterSchema);
    return jsonNoStore(await listApplications(filter), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

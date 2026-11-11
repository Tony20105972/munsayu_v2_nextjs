import { applicationDetailSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { getMaskedApplicationDetail } from "@/server/services/applications-admin";
import { errorResponse, jsonNoStore, parseSearchParams } from "@/server/http";

/** AD-008 신청 1건 상세(마스킹). 원문은 reveal 경로에서만 보여 준다. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = parseSearchParams(request, applicationDetailSchema);
    const detail = await getMaskedApplicationDetail(input.kind, input.applicationId);
    return jsonNoStore(detail, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

import { consultationFilterSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { listConsultationApplications } from "@/server/services/consultations";
import { errorResponse, jsonNoStore, parseSearchParams } from "@/server/http";

/** AD-009 상담 신청 목록 (마스킹). 매 요청 권한을 확인한다. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const filter = parseSearchParams(request, consultationFilterSchema);
    return jsonNoStore(await listConsultationApplications(filter), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

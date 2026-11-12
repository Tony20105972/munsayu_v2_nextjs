import { consultationExportSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { exportConsultationsCsv } from "@/server/services/consultations";
import { csvResponse, errorResponse, parseSearchParams } from "@/server/http";

/** AD-013 현재 필터 결과 전체 CSV. 감사기록을 남긴다. (ASM-006) */
export async function GET(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const filter = parseSearchParams(request, consultationExportSchema);
    const result = await exportConsultationsCsv(admin.id, filter);
    return csvResponse(result.csv, "consultations.csv");
  } catch (error) {
    return errorResponse(error);
  }
}

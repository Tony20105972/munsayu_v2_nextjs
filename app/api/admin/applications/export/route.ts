import { applicationExportSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { exportApplicationsCsv } from "@/server/services/applications-admin";
import { csvResponse, errorResponse, parseSearchParams } from "@/server/http";

/** AD-013 현재 필터 결과 전체 CSV 내보내기. 감사기록을 남긴다. (ASM-006) */
export async function GET(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const filter = parseSearchParams(request, applicationExportSchema);
    const result = await exportApplicationsCsv(admin.id, filter);
    return csvResponse(result.csv, `applications-${filter.kind}.csv`);
  } catch (error) {
    return errorResponse(error);
  }
}

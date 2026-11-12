import { instructorApplicationExportSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { exportInstructorApplicationsCsv } from "@/server/services/instructor-applications";
import { csvResponse, errorResponse, parseSearchParams } from "@/server/http";

/** AD-013 강사 지원 CSV. 제출 서류 파일 자체는 넣지 않는다. */
export async function GET(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const filter = parseSearchParams(request, instructorApplicationExportSchema);
    const result = await exportInstructorApplicationsCsv(admin.id, filter);
    return csvResponse(result.csv, "instructor-applications.csv");
  } catch (error) {
    return errorResponse(error);
  }
}

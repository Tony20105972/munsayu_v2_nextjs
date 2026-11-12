import { instructorApplicationFilterSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { listInstructorApplications } from "@/server/services/instructor-applications";
import { errorResponse, jsonNoStore, parseSearchParams } from "@/server/http";

/** AD-011 강사 지원 목록 (마스킹). */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const filter = parseSearchParams(request, instructorApplicationFilterSchema);
    return jsonNoStore(await listInstructorApplications(filter), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

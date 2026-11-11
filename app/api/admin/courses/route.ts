import { courseUpsertSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { createCourse, listAdminCourses } from "@/server/services/courses";
import {
  errorResponse,
  jsonNoStore,
  parseJsonBody,
  parseSearchParams,
} from "@/server/http";
import { adminCourseListSchema } from "@/server/validation";

/** AD-007 시간표(강좌) 목록. 지점·접수상태로 거른다. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const filter = parseSearchParams(request, adminCourseListSchema);
    return jsonNoStore(await listAdminCourses(filter), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

/** AD-007 강좌 추가. */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseJsonBody(request, courseUpsertSchema);
    const course = await createCourse(input);
    return jsonNoStore({ id: course.id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

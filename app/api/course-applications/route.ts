import { courseApplicationSchema } from "@/lib/contracts";
import { createCourseApplication } from "@/server/services/course-applications";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

/** FM-001 강좌 수강 신청. 같은 key 재전송은 기존 건을 201 + replayed=true로 돌려준다. */
export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "course-applications");
    const input = await parseJsonBody(request, courseApplicationSchema);
    const result = await createCourseApplication(input);
    return jsonNoStore(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

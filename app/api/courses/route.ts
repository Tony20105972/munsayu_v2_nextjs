import { listPublicCourses } from "@/server/services/courses";
import { errorResponse, jsonNoStore } from "@/server/http";

/** PG-008/009 공개 시간표 조회. 개인정보가 없어 캐시를 막을 필요는 없지만 단순하게 맞춘다. */
export async function GET(request: Request): Promise<Response> {
  try {
    const campusId = new URL(request.url).searchParams.get("campusId") ?? undefined;
    const items = await listPublicCourses({ campusId });
    return jsonNoStore({ items }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

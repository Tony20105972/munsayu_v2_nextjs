import { listPublicEvents } from "@/server/services/events";
import { errorResponse, jsonNoStore } from "@/server/http";

/** PG-010 공개 설명회 목록. 상태 문구는 관리자가 고른 값을 그대로 보여 준다. */
export async function GET(request: Request): Promise<Response> {
  try {
    const campusId = new URL(request.url).searchParams.get("campusId") ?? undefined;
    const items = await listPublicEvents({ campusId });
    return jsonNoStore({ items }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

import { listTeams } from "@/server/services/instructors";
import { errorResponse, jsonNoStore } from "@/server/http";

/** PG-005~007 강사진 공개 목록. 팀별 노출 순서대로 돌려준다. (ASM-003) */
export async function GET(request: Request): Promise<Response> {
  try {
    const teamId = new URL(request.url).searchParams.get("teamId") ?? undefined;
    return jsonNoStore({ teams: await listTeams({ teamId }) }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

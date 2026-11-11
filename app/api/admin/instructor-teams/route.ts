import { requireAdmin } from "@/server/auth";
import { createTeam, listTeams } from "@/server/services/instructors";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";
import { instructorTeamCreateSchema } from "@/server/validation";

/** AD-006 강사 팀 목록(팀별 노출 순서 포함). */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    return jsonNoStore({ items: await listTeams() }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseJsonBody(request, instructorTeamCreateSchema);
    const team = await createTeam(input.name);
    return jsonNoStore({ id: team.id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

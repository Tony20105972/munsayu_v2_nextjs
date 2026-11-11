import {
  instructorTeamMembershipDeleteSchema,
  instructorTeamMembershipSchema,
} from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { removeTeamMembership, setTeamMembership } from "@/server/services/instructors";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-006 팀 소속 추가·순서 변경. 같은 강사를 여러 팀에 넣을 수 있다. (ASM-003) */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseJsonBody(request, instructorTeamMembershipSchema);
    await setTeamMembership(input);
    return jsonNoStore(input, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseJsonBody(request, instructorTeamMembershipDeleteSchema);
    await removeTeamMembership(input.instructorId, input.teamId);
    return jsonNoStore({ ...input, removed: true }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

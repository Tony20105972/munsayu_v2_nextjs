import { memberStatusChangeSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { changeMemberStatus } from "@/server/services/members";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-002 회원 상태 변경. 변경 기록을 남긴다. */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const input = await parseJsonBody(request, memberStatusChangeSchema);
    return jsonNoStore(await changeMemberStatus(admin.id, input), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

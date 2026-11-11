import { memberSearchSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { memberCountsByStatus, searchMembers } from "@/server/services/members";
import { errorResponse, jsonNoStore, parseSearchParams } from "@/server/http";

/** AD-002 회원 검색. 목록에는 가린 값만 담는다. 검색어는 기록에 남기지 않는다. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = parseSearchParams(request, memberSearchSchema);
    const [list, counts] = await Promise.all([
      searchMembers(input),
      memberCountsByStatus(),
    ]);
    return jsonNoStore({ ...list, counts }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

import { withdrawSchema } from "@/lib/contracts";
import { clearSessionCookieHeader, requireMember, withCookies } from "@/server/auth";
import { withdrawMember } from "@/server/services/accounts";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** FM-003 탈퇴. 상태를 WITHDRAWN으로 바꾸고 세션을 모두 끊는다. */
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireMember(request);
    const input = await parseJsonBody(request, withdrawSchema);
    await withdrawMember(user.id, input);
    const response = jsonNoStore({ message: "탈퇴 처리되었습니다." }, 200);
    return withCookies(response, [clearSessionCookieHeader("MEMBER")]);
  } catch (error) {
    return errorResponse(error);
  }
}

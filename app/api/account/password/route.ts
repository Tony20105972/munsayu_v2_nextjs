import { changePasswordSchema } from "@/lib/contracts";
import { clearSessionCookieHeader, requireMember, withCookies } from "@/server/auth";
import { changePassword } from "@/server/services/accounts";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** FM-003 비밀번호 변경. 변경 후에는 기존 세션을 모두 끊는다. */
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireMember(request);
    const input = await parseJsonBody(request, changePasswordSchema);
    await changePassword(user.id, input);
    const response = jsonNoStore({ message: "비밀번호를 바꿨습니다." }, 200);
    return withCookies(response, [clearSessionCookieHeader("MEMBER")]);
  } catch (error) {
    return errorResponse(error);
  }
}

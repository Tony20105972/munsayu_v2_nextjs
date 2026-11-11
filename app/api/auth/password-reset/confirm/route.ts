import { resetPasswordSchema } from "@/lib/contracts";
import { clearSessionCookieHeader, withCookies } from "@/server/auth";
import { confirmPasswordReset } from "@/server/services/accounts";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** FM-003 비밀번호 재설정 확정. 토큰은 1회용이고 성공하면 기존 세션을 모두 끊는다. */
export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseJsonBody(request, resetPasswordSchema);
    await confirmPasswordReset(input);
    const response = jsonNoStore({ message: "비밀번호를 다시 설정했습니다." }, 200);
    return withCookies(response, [
      clearSessionCookieHeader("MEMBER"),
      clearSessionCookieHeader("ADMIN"),
    ]);
  } catch (error) {
    return errorResponse(error);
  }
}

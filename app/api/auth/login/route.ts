import { loginSchema } from "@/lib/contracts";
import {
  issueSession,
  sessionCookieHeader,
  toSessionUser,
  withCookies,
} from "@/server/auth";
import { authenticate } from "@/server/services/accounts";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

/**
 * FM-003 / AD-001 로그인.
 * 역할에 따라 회원 쿠키와 관리자 쿠키를 나눠 발급한다. 회원 쿠키로는 관리자 요청이 통과하지 않는다.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "auth-login");
    const input = await parseJsonBody(request, loginSchema);
    const user = await authenticate(input);
    const scope = user.role === "ADMIN" ? "ADMIN" : "MEMBER";
    const session = await issueSession(user.id, scope, input.rememberMe);
    const response = jsonNoStore(toSessionUser(user), 200);
    return withCookies(response, [
      sessionCookieHeader(scope, session.token, session.cookieMaxAgeSeconds),
    ]);
  } catch (error) {
    return errorResponse(error);
  }
}

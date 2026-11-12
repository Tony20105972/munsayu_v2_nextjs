import { registerSchema } from "@/lib/contracts";
import { issueSession, sessionCookieHeader, withCookies } from "@/server/auth";
import { registerMember } from "@/server/services/accounts";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

/** FM-003 회원가입. 가입과 동시에 회원 세션을 발급한다. */
export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "auth-register");
    const input = await parseJsonBody(request, registerSchema);
    const user = await registerMember(input);
    const session = await issueSession(user.id, "MEMBER", false);
    const response = jsonNoStore(
      { id: user.id, loginId: user.loginId, name: user.name, role: user.role },
      201,
    );
    return withCookies(response, [
      sessionCookieHeader("MEMBER", session.token, session.cookieMaxAgeSeconds),
    ]);
  } catch (error) {
    return errorResponse(error);
  }
}

import { clearSessionCookieHeader, destroySession, withCookies } from "@/server/auth";
import { emptyNoStore, errorResponse } from "@/server/http";

/** FM-003 / AD-001 로그아웃. 두 범위의 쿠키를 모두 지운다. */
export async function POST(request: Request): Promise<Response> {
  try {
    await destroySession(request, "MEMBER");
    await destroySession(request, "ADMIN");
    return withCookies(emptyNoStore(204), [
      clearSessionCookieHeader("MEMBER"),
      clearSessionCookieHeader("ADMIN"),
    ]);
  } catch (error) {
    return errorResponse(error);
  }
}

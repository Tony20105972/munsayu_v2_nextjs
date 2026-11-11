import { toSessionUser } from "@/server/auth";
import { resolveSession } from "@/server/auth/session";
import { errorResponse, jsonNoStore } from "@/server/http";

/** 화면이 현재 세션을 확인할 때 쓴다. 비로그인도 200으로 답하고 null을 돌려준다. */
export async function GET(request: Request): Promise<Response> {
  try {
    const admin = await resolveSession(request, "ADMIN");
    if (admin) return jsonNoStore({ user: toSessionUser(admin) }, 200);

    const member = await resolveSession(request, "MEMBER");
    if (member) return jsonNoStore({ user: toSessionUser(member) }, 200);

    return jsonNoStore({ user: null }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

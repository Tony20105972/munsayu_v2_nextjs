import "server-only";
import type { User } from "@prisma/client";
import { forbidden, passwordChangeRequired, unauthenticated } from "@/server/errors";
import { resolveSession } from "@/server/auth/session";

/** 회원 전용 요청. 매 요청 서버에서 다시 확인한다. (BLUEPRINT 7장) */
export async function requireMember(request: Request): Promise<User> {
  const user = await resolveSession(request, "MEMBER");
  if (!user) throw unauthenticated();
  return user;
}

/**
 * 관리자 전용 요청.
 * 관리자 세션이 없고 회원 세션만 있으면 403, 아무 세션도 없으면 401로 구분한다.
 */
export async function requireAdmin(
  request: Request,
  options: { allowPasswordChangePending?: boolean } = {},
): Promise<User> {
  const admin = await resolveSession(request, "ADMIN");
  if (admin) {
    // AD-016 임시 비밀번호 상태에서는 다른 요청을 받지 않는다.
    if (admin.mustChangePassword && !options.allowPasswordChangePending) {
      throw passwordChangeRequired();
    }
    return admin;
  }

  const member = await resolveSession(request, "MEMBER");
  if (member) throw forbidden();

  throw unauthenticated();
}

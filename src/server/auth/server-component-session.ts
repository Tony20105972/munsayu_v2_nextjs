import "server-only";
import type { SessionScope } from "@prisma/client";
import type { SessionUser } from "@/lib/contracts";
import { forbidden, unauthenticated } from "@/server/errors";
import { SESSION_COOKIE_NAMES } from "@/server/auth/cookies";
import { resolveSessionByToken, toSessionUser } from "@/server/auth/session";

/**
 * Server Component에서 세션을 읽는 헬퍼.
 *
 * Route Handler는 `requireMember(request)` / `requireAdmin(request)`를 쓴다(표준 Request 기반).
 * 화면(Server Component)에는 `Request`가 없어 쿠키를 직접 읽어야 하므로 이 파일을 쓴다.
 *
 * 이 모듈은 `next/headers`에 의존하므로 `@/server/auth` 배럴에는 넣지 않는다.
 * 배럴에 넣으면 Route Handler와 통합 테스트까지 `next/headers`를 끌어오게 된다.
 * 화면에서는 `@/server/auth/server-component-session`을 직접 import한다.
 */

export type AuthenticatedSession = {
  user: SessionUser;
  /** 어떤 쿠키로 인증된 세션인지. 관리자 세션이 있으면 그쪽을 먼저 본다. */
  scope: SessionScope;
};

async function readSessionCookie(scope: SessionScope): Promise<string | null> {
  // Next 16에서 cookies()는 async다.
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return jar.get(SESSION_COOKIE_NAMES[scope])?.value ?? null;
}

/**
 * 회원·관리자 공용. 로그인 상태가 아니면 null이다.
 * 관리자 세션과 회원 세션을 모두 가진 경우 관리자 세션을 돌려준다.
 */
export async function getSessionUserFromCookies(): Promise<AuthenticatedSession | null> {
  const admin = await resolveSessionByToken(await readSessionCookie("ADMIN"), "ADMIN");
  if (admin) return { user: toSessionUser(admin), scope: "ADMIN" };

  const member = await resolveSessionByToken(
    await readSessionCookie("MEMBER"),
    "MEMBER",
  );
  if (member) return { user: toSessionUser(member), scope: "MEMBER" };

  return null;
}

/** 관리자 세션이 아니면 null. 화면에서 `redirect()`로 보내고 싶을 때 쓴다. */
export async function getAdminUserFromCookies(): Promise<SessionUser | null> {
  const admin = await resolveSessionByToken(await readSessionCookie("ADMIN"), "ADMIN");
  return admin ? toSessionUser(admin) : null;
}

/** 회원 세션이 아니면 null. */
export async function getMemberUserFromCookies(): Promise<SessionUser | null> {
  const member = await resolveSessionByToken(
    await readSessionCookie("MEMBER"),
    "MEMBER",
  );
  return member ? toSessionUser(member) : null;
}

/**
 * 관리자가 아니면 AppError를 던진다. 아무 세션도 없으면 401, 회원 세션만 있으면 403이다.
 * 오류 경계 없이 로그인 화면으로 보내려면 `getAdminUserFromCookies()` + `redirect()`를 쓴다.
 */
export async function requireAdminFromCookies(): Promise<SessionUser> {
  const admin = await getAdminUserFromCookies();
  if (admin) return admin;

  const member = await getMemberUserFromCookies();
  if (member) throw forbidden();

  throw unauthenticated();
}

/** 회원이 아니면 AppError(401)를 던진다. */
export async function requireMemberFromCookies(): Promise<SessionUser> {
  const member = await getMemberUserFromCookies();
  if (!member) throw unauthenticated();
  return member;
}

import "server-only";
import type { Prisma, SessionScope, User } from "@prisma/client";
import type { SessionUser } from "@/lib/contracts";
import { db } from "@/server/db";
import {
  REMEMBER_ME_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAMES,
  SESSION_ONLY_LIFETIME_SECONDS,
  readCookie,
} from "@/server/auth/cookies";
import { createToken, hashToken } from "@/server/auth/tokens";

export type IssuedSession = {
  token: string;
  scope: SessionScope;
  expiresAt: Date;
  /** 쿠키 Max-Age. null이면 브라우저 세션 쿠키로 둔다. */
  cookieMaxAgeSeconds: number | null;
};

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    loginId: user.loginId,
    name: user.name,
    role: user.role,
  };
}

/** 세션 행을 만들고 쿠키에 담을 토큰을 돌려준다. 쿠키 조작은 Route Handler가 한다. */
export async function issueSession(
  userId: string,
  scope: SessionScope,
  rememberMe: boolean,
  client: Prisma.TransactionClient | typeof db = db,
): Promise<IssuedSession> {
  const lifetimeSeconds = rememberMe
    ? REMEMBER_ME_MAX_AGE_SECONDS
    : SESSION_ONLY_LIFETIME_SECONDS;
  const token = createToken();
  const expiresAt = new Date(Date.now() + lifetimeSeconds * 1000);

  await client.authSession.create({
    data: { userId, scope, tokenHash: hashToken(token), expiresAt },
  });

  return {
    token,
    scope,
    expiresAt,
    cookieMaxAgeSeconds: rememberMe ? REMEMBER_ME_MAX_AGE_SECONDS : null,
  };
}

/**
 * 토큰 하나를 세션 행·계정 상태까지 다시 확인한다.
 * 범위가 맞지 않거나 계정이 ACTIVE가 아니면 세션으로 보지 않는다.
 */
export async function resolveSessionByToken(
  token: string | null,
  scope: SessionScope,
): Promise<User | null> {
  if (!token) return null;

  const session = await db.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.scope !== scope) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (session.user.status !== "ACTIVE") return null;
  if (scope === "ADMIN" && session.user.role !== "ADMIN") return null;

  return session.user;
}

/** 요청마다 쿠키 → 세션 행 → 계정 상태를 다시 확인한다. (Route Handler 경로) */
export async function resolveSession(
  request: Request,
  scope: SessionScope,
): Promise<User | null> {
  return resolveSessionByToken(readCookie(request, SESSION_COOKIE_NAMES[scope]), scope);
}

export async function destroySession(
  request: Request,
  scope: SessionScope,
): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE_NAMES[scope]);
  if (!token) return;
  await db.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** 비밀번호 변경·탈퇴 후 기존 세션을 모두 끊는다. */
export async function invalidateUserSessions(
  userId: string,
  client: Prisma.TransactionClient | typeof db = db,
): Promise<void> {
  await client.authSession.deleteMany({ where: { userId } });
}

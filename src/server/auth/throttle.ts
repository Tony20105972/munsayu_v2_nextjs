import "server-only";
import type { SessionScope } from "@prisma/client";
import { LOGIN_ATTEMPT_LIMIT } from "@/lib/contracts";
import { db } from "@/server/db";
import { rateLimited } from "@/server/errors";
import { hashIdentifier } from "@/server/auth/tokens";

const MINUTE = 60_000;

/**
 * 로그인 시도 제한. 서버 재시작 후에도 유지되도록 DB에 기록한다. (BLUEPRINT 7장)
 * `maxAttempts`회 실패가 `windowMinutes` 안에 모이면 마지막 실패로부터
 * `lockMinutes` 동안 더 시도할 수 없다.
 */
export async function assertLoginAllowed(
  loginId: string,
  scope: SessionScope,
): Promise<void> {
  const { maxAttempts, windowMinutes, lockMinutes } = LOGIN_ATTEMPT_LIMIT;
  const identifierHash = hashIdentifier(loginId);
  const lockStart = new Date(Date.now() - lockMinutes * MINUTE);

  const failures = await db.loginAttempt.findMany({
    where: {
      identifierHash,
      scope,
      succeeded: false,
      attemptedAt: { gte: lockStart },
    },
    orderBy: { attemptedAt: "desc" },
    take: maxAttempts,
    select: { attemptedAt: true },
  });

  if (failures.length < maxAttempts) return;

  const newest = failures[0].attemptedAt.getTime();
  const oldest = failures[failures.length - 1].attemptedAt.getTime();
  const burstInsideWindow = newest - oldest <= windowMinutes * MINUTE;
  const stillLocked = Date.now() - newest < lockMinutes * MINUTE;

  if (burstInsideWindow && stillLocked) {
    throw rateLimited();
  }
}

/** 성공하면 이전 실패 기록을 지워 카운터를 되돌린다. */
export async function recordLoginAttempt(
  loginId: string,
  scope: SessionScope,
  succeeded: boolean,
): Promise<void> {
  const identifierHash = hashIdentifier(loginId);
  if (succeeded) {
    await db.loginAttempt.deleteMany({ where: { identifierHash, scope } });
  }
  await db.loginAttempt.create({ data: { identifierHash, scope, succeeded } });
}

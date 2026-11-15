import "server-only";
import type { SessionScope } from "@prisma/client";
import { LOGIN_ATTEMPT_LIMIT } from "@/lib/contracts";
import { db } from "@/server/db";
import { rateLimited } from "@/server/errors";
import { hashIdentifier } from "@/server/auth/tokens";

const MINUTE = 60_000;

/** 잠겨 있는지와, 잠겨 있다면 언제까지인지. */
export type LoginLockState =
  | { locked: false }
  | { locked: true; lockedUntil: Date; retryAfterMinutes: number };

/**
 * 현재 잠금 상태를 계산한다. 기록을 남기지 않는 읽기 전용 함수다.
 * `maxAttempts`회 실패가 `windowMinutes` 안에 모이면 마지막 실패로부터
 * `lockMinutes` 동안 잠긴다.
 */
export async function getLoginLockState(
  loginId: string,
  scope: SessionScope,
): Promise<LoginLockState> {
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

  if (failures.length < maxAttempts) return { locked: false };

  const newest = failures[0].attemptedAt.getTime();
  const oldest = failures[failures.length - 1].attemptedAt.getTime();
  const burstInsideWindow = newest - oldest <= windowMinutes * MINUTE;
  const lockedUntil = newest + lockMinutes * MINUTE;
  const remainingMs = lockedUntil - Date.now();

  if (!burstInsideWindow || remainingMs <= 0) return { locked: false };

  return {
    locked: true,
    lockedUntil: new Date(lockedUntil),
    // 0분으로 안내하지 않는다. 1분 미만이면 1분으로 올려 말한다.
    retryAfterMinutes: Math.max(1, Math.ceil(remainingMs / MINUTE)),
  };
}

/**
 * 로그인 시도 제한. 서버 재시작 후에도 유지되도록 DB에 기록한다. (BLUEPRINT 7장)
 *
 * 잠긴 동안의 시도는 **실패로 기록하지 않는다.** 여기서 바로 던지므로
 * `recordLoginAttempt()` 까지 가지 않는다. 그래서 잠금이 계속 연장되지 않고
 * 마지막 실패로부터 `lockMinutes` 뒤에 반드시 풀린다. (ADR-005)
 */
export async function assertLoginAllowed(
  loginId: string,
  scope: SessionScope,
): Promise<void> {
  const state = await getLoginLockState(loginId, scope);
  if (!state.locked) return;

  // 잠금 여부는 계정이 있든 없든 똑같이 계산되므로 계정 존재 여부가 드러나지 않는다.
  throw rateLimited(
    `시도 횟수를 넘었습니다. ${state.retryAfterMinutes}분 뒤 다시 시도해 주세요.`,
  );
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

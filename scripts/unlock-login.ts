import "dotenv/config";
import { SessionScope } from "@prisma/client";
import { db } from "@/server/db";
import { hashIdentifier } from "@/server/auth/tokens";
import { getLoginLockState } from "@/server/auth/throttle";

/**
 * 로컬 전용 로그인 잠금 초기화.
 *
 * 로그인 시도 제한은 DB(`LoginAttempt`)에 남아 서버를 다시 켜도 유지된다(ADR-005).
 * 그래서 개발 중 비밀번호를 몇 번 틀리면 15분을 기다려야 하는데, 로컬에서는 그럴 이유가 없다.
 * 이 스크립트는 그 실패 기록만 지운다. 계정·비밀번호·세션은 건드리지 않는다.
 *
 * 쓰는 법:
 *   npm run db:unlock              # 모든 실패 기록 삭제
 *   npm run db:unlock -- admin     # loginId 가 admin 인 것만 삭제
 *
 * 운영에서는 돌지 않는다. 잠금은 공격을 막는 장치이므로 운영에서 임의로 풀지 않는다.
 */

function assertLocalOnly(): void {
  const blockers: string[] = [];
  if (process.env.NODE_ENV === "production") blockers.push("NODE_ENV=production");
  if (process.env.VERCEL) blockers.push("VERCEL");
  if (process.env.CI) blockers.push("CI");

  if (blockers.length > 0) {
    console.error(
      `db:unlock 은 로컬 전용입니다. 다음 때문에 중단했습니다: ${blockers.join(", ")}`,
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  assertLocalOnly();

  const loginId = process.argv[2]?.trim();

  if (!loginId) {
    const { count } = await db.loginAttempt.deleteMany({});
    console.log(`로그인 실패 기록 ${count}건을 지웠습니다. 모든 계정의 잠금이 풀렸습니다.`);
    return;
  }

  // 원문 loginId 는 저장하지 않으므로 같은 방식으로 해시해서 찾는다.
  const identifierHash = hashIdentifier(loginId);
  const { count } = await db.loginAttempt.deleteMany({ where: { identifierHash } });

  // 정말 풀렸는지 두 범위 모두 확인한다.
  const states = await Promise.all(
    Object.values(SessionScope).map(async (scope) => {
      const state = await getLoginLockState(loginId, scope);
      return `${scope}=${state.locked ? "잠김" : "풀림"}`;
    }),
  );

  console.log(
    `로그인 실패 기록 ${count}건을 지웠습니다. (${loginId}) 현재 상태: ${states.join(", ")}`,
  );
}

main()
  .catch((error: unknown) => {
    // 비밀번호·개인정보가 섞일 수 있으므로 오류 이름만 남긴다.
    console.error("db_unlock_failed", {
      name: error instanceof Error ? error.name : "Unknown",
    });
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });

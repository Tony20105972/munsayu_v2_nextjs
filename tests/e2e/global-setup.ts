import "dotenv/config";
import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { MAIL_OUTBOX_FILE } from "../../playwright.config";

/**
 * E2E 는 seed 상태에서 시작한다.
 *
 * 신청·예약 기록과 테스트가 만든 회원을 지워 두지 않으면 지난 실행이 남긴 행과 섞여
 * 가린 값(마스킹)으로 행을 찾을 때 서로 겹친다. 운영 데이터는 쓰지 않는다.
 *
 * 로그인 비밀번호는 seed 가 `.env` 의 `SEED_*_PASSWORD` 로 정한다. 테스트도 같은 값을
 * 봐야 하므로 `playwright.config.ts` 에서 `.env` 를 읽고 `helpers.ts` 가 같은 규칙으로
 * 비밀번호를 만든다. 여기서 비밀번호를 덮어쓰지 않는다.
 */
/**
 * 이 설정은 **행을 지운다.** 실수로 운영 DB 를 가리킨 채 돌면 신청·공지·강사가 사라진다.
 * `scripts/unlock-login.ts` 와 같은 기준으로 로컬·CI 가 아니면 멈춘다.
 */
function assertDisposableDatabase(): void {
  const blockers: string[] = [];
  if (process.env.NODE_ENV === "production") blockers.push("NODE_ENV=production");
  if (process.env.VERCEL) blockers.push("VERCEL");

  const url = process.env.DATABASE_URL?.trim() ?? "";
  const local = /@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(url);
  // CI 는 서비스 컨테이너를 쓰므로 호스트가 로컬이 아니어도 괜찮다.
  if (!local && !process.env.CI) {
    blockers.push("DATABASE_URL 이 로컬 주소가 아님");
  }

  if (blockers.length > 0) {
    throw new Error(
      `E2E 는 버려도 되는 DB 에서만 돌린다. 다음 때문에 멈췄다: ${blockers.join(", ")}`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  assertDisposableDatabase();

  execFileSync("npx", ["tsx", "--conditions=react-server", "prisma/seed.ts"], {
    stdio: "inherit",
  });

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });
  try {
    await db.courseApplication.deleteMany({});
    await db.eventReservation.deleteMany({});
    await db.auditLog.deleteMany({});
    await db.passwordResetToken.deleteMany({});
    await db.loginAttempt.deleteMany({});
    // seed 가 만든 admin·member 만 남기고 테스트가 만든 회원을 지운다.
    await db.user.deleteMany({ where: { loginId: { notIn: ["admin", "member01"] } } });

    /*
     * 공개 화면에 **그대로 보이는** 행도 지운다.
     *
     * 지우지 않으면 AD-014·AD-011·AD-009·AD-010 흐름이 만든 공지·강사·신청이 쌓여서
     * 공개 화면이 실행할수록 길어진다. 그러면 저장된 기준 이미지와 높이가 달라져
     * 시각 회귀(PG-001·PG-005·PG-012)가 실패한다. 실제로 `npm run e2e` 뒤에
     * `npm run e2e:visual` 을 돌리면 공지 18건·강사 1명이 남아 6건이 깨졌다.
     *
     * seed 가 넣는 행은 `seed-` 로 시작하는 id 를 쓴다. 그 행만 남긴다.
     * 이 DB 는 테스트가 소유한다는 전제다(위의 회원 삭제와 같은 규칙).
     */
    await db.instructorApplication.deleteMany({});
    await db.consultationApplication.deleteMany({});
    await db.smsSubscription.deleteMany({});
    await db.notice.deleteMany({ where: { id: { not: { startsWith: "seed-" } } } });
    await db.instructor.deleteMany({ where: { id: { not: { startsWith: "seed-" } } } });
  } finally {
    await db.$disconnect();
  }

  await rm(MAIL_OUTBOX_FILE, { force: true });
}

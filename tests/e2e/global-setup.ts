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
 */
export default async function globalSetup(): Promise<void> {
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
  } finally {
    await db.$disconnect();
  }

  await rm(MAIL_OUTBOX_FILE, { force: true });
}

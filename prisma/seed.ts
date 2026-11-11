import * as Prisma from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new ((Prisma as any).PrismaClient as any)();
const passwordHash = (password: string) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; };
async function main() {
  const campus = await db.campus.upsert({ where: { name: "테스트 캠퍼스" }, update: {}, create: { id: "seed-campus", name: "테스트 캠퍼스" } });
  await db.course.upsert({ where: { id: "seed-course-open" }, update: {}, create: { id: "seed-course-open", campusId: campus.id, title: "테스트 강좌" } });
  const status = await db.eventStatusOption.upsert({ where: { label: "접수중" }, update: {}, create: { id: "seed-status-open", label: "접수중" } });
  await db.event.upsert({ where: { managementCode: "TEST-2026" }, update: {}, create: { id: "seed-event", campusId: campus.id, managementCode: "TEST-2026", title: "테스트 설명회", startsAt: new Date("2027-01-01T10:00:00Z"), statusOptionId: status.id } });
  await db.user.upsert({ where: { loginId: "admin" }, update: {}, create: { id: "seed-admin", loginId: "admin", passwordHash: passwordHash("change-me-before-use"), name: "테스트 관리자", email: "admin@example.test", phone: "01000000000", role: "ADMIN" } });
  await db.privacyRetentionSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
main().finally(() => db.$disconnect());

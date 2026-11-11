import "server-only";
import { db } from "@/server/db";

export const mask = (value: string) => value.length < 3 ? "***" : `${value.slice(0, 1)}***${value.slice(-1)}`;
export async function audit(actorUserId: string, action: "PII_VIEW" | "CSV_EXPORT" | "PII_PURGE", resourceType: string, filterSummary?: string) {
  return db.auditLog.create({ data: { actorUserId, action, resourceType, filterSummary } });
}
export async function exportApplications(actorUserId: string) {
  const rows = await db.courseApplication.findMany({ orderBy: { createdAt: "desc" }, include: { course: { select: { title: true } } } });
  await audit(actorUserId, "CSV_EXPORT", "CourseApplication", `count=${rows.length}`);
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ["id,course,studentName,guardianPhone,schoolName,department,grade,status,createdAt", ...rows.map((r: any) => [r.id, r.course.title, r.studentName, r.guardianPhone, r.schoolName, r.department, r.grade, r.status, r.createdAt.toISOString()].map(esc).join(","))].join("\n");
}
export async function purgeEligible(actorUserId: string) {
  const now = new Date();
  const [courses, events] = await db.$transaction([
    db.courseApplication.updateMany({ where: { purgeEligibleAt: { lte: now } }, data: { studentName: "PURGED", guardianPhone: "PURGED", schoolName: "PURGED" } }),
    db.eventReservation.updateMany({ where: { purgeEligibleAt: { lte: now } }, data: { name: "PURGED", phone: "PURGED" } }),
  ]);
  const log = await audit(actorUserId, "PII_PURGE", "PII", `course=${courses.count};event=${events.count}`);
  return { courseApplications: courses.count, eventReservations: events.count, auditId: log.id };
}

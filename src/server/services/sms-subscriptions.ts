import "server-only";
import {
  maskName,
  maskPhone,
  maskSchoolName,
  type AdminSmsSubscriptionList,
  type AdminSmsSubscriptionRow,
  type ApplicationCreatedResult,
  type SmsSubscriptionDeleteInput,
  type SmsSubscriptionExportInput,
  type SmsSubscriptionFilterInput,
  type SmsSubscriptionInput,
} from "@/lib/contracts";
import { notifyQuietly } from "@/server/adapters/notify";
import { db, isUniqueViolation } from "@/server/db";
import { notFound } from "@/server/errors";
import { csvRows } from "@/server/lib/csv";
import { summarizeFilter, writeAuditLog } from "@/server/services/audit";
import {
  getRetentionSetting,
  resolveRetentionPolicyVersion,
} from "@/server/services/privacy";

/**
 * AD-010 설명회 알림 신청 (레거시 관리자 메뉴 `문자신청내역`).
 *
 * 레거시 메인 하단 폼(`POST ./sms_subscribe.ajax.php`, EV-0003)의 항목을 그대로 받되,
 * 레거시에 없던 개인정보·알림 수신 동의를 새로 둔다. // ASM-086
 * **문자 발송은 하지 않는다.** 신청 내역만 보관한다. (D4, 사용자 결정 2026-11-12)
 */

type InsertOutcome = { id: string; createdAt: Date; replayed: boolean };

export async function createSmsSubscription(
  input: SmsSubscriptionInput,
): Promise<ApplicationCreatedResult> {
  const setting = await getRetentionSetting();
  const retentionPolicyVersion = resolveRetentionPolicyVersion("sms", setting);

  const insertOnce = async (): Promise<InsertOutcome> => {
    const existing = await db.smsSubscription.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, createdAt: true },
    });
    if (existing) {
      return { id: existing.id, createdAt: existing.createdAt, replayed: true };
    }

    const now = new Date();
    const created = await db.smsSubscription.create({
      data: {
        grade: input.grade,
        studentName: input.studentName,
        schoolName: input.schoolName,
        guardianPhone: input.guardianPhone,
        privacyConsentAt: now,
        notifyConsentAt: now,
        retentionPolicyVersion,
        idempotencyKey: input.idempotencyKey,
      },
      select: { id: true, createdAt: true },
    });
    return { id: created.id, createdAt: created.createdAt, replayed: false };
  };

  let result: InsertOutcome;
  try {
    result = await insertOnce();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const saved = await db.smsSubscription.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, createdAt: true },
    });
    if (!saved) throw error;
    result = { id: saved.id, createdAt: saved.createdAt, replayed: true };
  }

  if (!result.replayed) {
    // 신청자에게 보내는 문자는 없다. 직원 알림만 어댑터로 흘린다.
    await notifyQuietly({
      channel: "staff",
      text: "새 설명회 알림 신청 1건이 접수되었습니다.",
    });
  }

  return {
    id: result.id,
    replayed: result.replayed,
    createdAt: result.createdAt.toISOString(),
  };
}

function smsWhere(filter: SmsSubscriptionExportInput) {
  const createdAt =
    filter.from || filter.to
      ? {
          ...(filter.from ? { gte: filter.from } : {}),
          ...(filter.to ? { lte: filter.to } : {}),
        }
      : undefined;

  return {
    ...(filter.grade ? { grade: filter.grade } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(filter.keyword
      ? {
          OR: [
            { studentName: { contains: filter.keyword } },
            { guardianPhone: { contains: filter.keyword } },
            { schoolName: { contains: filter.keyword } },
          ],
        }
      : {}),
  };
}

export async function listSmsSubscriptions(
  filter: SmsSubscriptionFilterInput,
): Promise<AdminSmsSubscriptionList> {
  const where = smsWhere(filter);
  const [total, rows] = await Promise.all([
    db.smsSubscription.count({ where }),
    db.smsSubscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
  ]);

  const items: AdminSmsSubscriptionRow[] = rows.map((row) => ({
    id: row.id,
    grade: row.grade,
    maskedStudentName: maskName(row.studentName),
    maskedSchoolName: maskSchoolName(row.schoolName),
    maskedGuardianPhone: maskPhone(row.guardianPhone),
    appliedAt: row.createdAt.toISOString(),
    purgeEligibleAt: row.purgeEligibleAt?.toISOString() ?? null,
  }));

  return { items, total, page: filter.page, pageSize: filter.pageSize };
}

export type RevealedSmsSubscription = {
  id: string;
  grade: string;
  studentName: string;
  schoolName: string;
  guardianPhone: string;
  appliedAt: string;
  privacyConsentAt: string;
  notifyConsentAt: string;
  retentionPolicyVersion: string;
  auditId: string;
};

export async function revealSmsSubscription(
  actorUserId: string,
  subscriptionId: string,
): Promise<RevealedSmsSubscription> {
  const row = await db.smsSubscription.findUnique({ where: { id: subscriptionId } });
  if (!row) throw notFound();

  const audit = await writeAuditLog({
    actorUserId,
    action: "PII_VIEW",
    resourceType: "SmsSubscription",
    resourceId: row.id,
  });

  return {
    id: row.id,
    grade: row.grade,
    studentName: row.studentName,
    schoolName: row.schoolName,
    guardianPhone: row.guardianPhone,
    appliedAt: row.createdAt.toISOString(),
    privacyConsentAt: row.privacyConsentAt.toISOString(),
    notifyConsentAt: row.notifyConsentAt.toISOString(),
    retentionPolicyVersion: row.retentionPolicyVersion,
    auditId: audit.id,
  };
}

export async function deleteSmsSubscriptions(
  actorUserId: string,
  input: SmsSubscriptionDeleteInput,
): Promise<{ deleted: number }> {
  const result = await db.smsSubscription.deleteMany({
    where: { id: { in: input.subscriptionIds } },
  });

  await writeAuditLog({
    actorUserId,
    action: "PII_PURGE",
    resourceType: "SmsSubscription",
    filterSummary: `deleted=${result.count}`,
  });

  return { deleted: result.count };
}

export async function exportSmsSubscriptionsCsv(
  actorUserId: string,
  filter: SmsSubscriptionExportInput,
): Promise<{ csv: string; rowCount: number; auditId: string }> {
  const rows = await db.smsSubscription.findMany({
    where: smsWhere(filter),
    orderBy: { createdAt: "desc" },
  });

  const csv = csvRows(
    ["신청ID", "학년", "학생 이름", "학교명", "보호자 연락처", "신청일시"],
    rows.map((row) => [
      row.id,
      row.grade,
      row.studentName,
      row.schoolName,
      row.guardianPhone,
      row.createdAt.toISOString(),
    ]),
  );

  const audit = await writeAuditLog({
    actorUserId,
    action: "CSV_EXPORT",
    resourceType: "SmsSubscription",
    filterSummary: summarizeFilter(
      {
        grade: filter.grade,
        keyword: filter.keyword,
        from: filter.from,
        to: filter.to,
      },
      rows.length,
    ),
  });

  return { csv, rowCount: rows.length, auditId: audit.id };
}

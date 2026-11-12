import "server-only";
import {
  CONSULTATION_STATUS_LABELS,
  DEFAULT_CONSULTATION_TYPES,
  maskName,
  maskPhone,
  type AdminConsultationList,
  type AdminConsultationRow,
  type ApplicationCreatedResult,
  type ConsultationApplicationInput,
  type ConsultationDeleteInput,
  type ConsultationExportInput,
  type ConsultationFilterInput,
  type ConsultationStatusChangeInput,
  type ConsultationTypeUpsertInput,
} from "@/lib/contracts";
import { db, isUniqueViolation } from "@/server/db";
import { notFound, validationFailed } from "@/server/errors";
import { notifyQuietly } from "@/server/adapters/notify";
import { csvRows } from "@/server/lib/csv";
import { summarizeFilter, writeAuditLog } from "@/server/services/audit";
import {
  getRetentionSetting,
  resolveRetentionPolicyVersion,
} from "@/server/services/privacy";

/**
 * AD-009 입학진단 및 상담 신청.
 *
 * 레거시 공개 화면은 외부 Google Forms 링크였고(EV-0013) 사이트 안에는 폼이 없었다.
 * 관리자 화면(EV-ADM-08)의 목록 열을 기준으로 신규 계약을 만들었다. // ASM-082
 * 중복 신청은 허용한다. idempotency key 는 같은 신청서의 재전송만 막는다. (ASM-001)
 */

export type ConsultationTypeOptionView = {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

/** 기본 상담 유형을 한 번 만들어 둔다. 관리자가 추가·수정할 수 있다. // ASM-083 */
export async function ensureConsultationTypes(): Promise<void> {
  const count = await db.consultationTypeOption.count();
  if (count > 0) return;

  await db.consultationTypeOption.createMany({
    data: DEFAULT_CONSULTATION_TYPES.map((label, index) => ({
      label,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}

export async function listConsultationTypes(
  options: { activeOnly?: boolean } = {},
): Promise<ConsultationTypeOptionView[]> {
  await ensureConsultationTypes();
  const rows = await db.consultationTypeOption.findMany({
    where: options.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  }));
}

export async function upsertConsultationType(
  input: ConsultationTypeUpsertInput,
): Promise<ConsultationTypeOptionView> {
  const data = {
    label: input.label,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  };

  const row = input.id
    ? await db.consultationTypeOption.update({ where: { id: input.id }, data })
    : await db.consultationTypeOption.create({ data });

  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

/** 이미 쓰인 유형은 지우지 않고 숨김으로 바꾼다. 지난 신청의 유형 이름이 사라지면 안 된다. */
export async function deactivateConsultationType(id: string): Promise<void> {
  await db.consultationTypeOption.update({ where: { id }, data: { isActive: false } });
}

type InsertOutcome = { id: string; createdAt: Date; replayed: boolean };

/** 공개 신청 저장. 저장과 중복 확인을 한 트랜잭션에서 한다. */
export async function createConsultationApplication(
  input: ConsultationApplicationInput,
): Promise<ApplicationCreatedResult> {
  const setting = await getRetentionSetting();
  const retentionPolicyVersion = resolveRetentionPolicyVersion("consultation", setting);

  const insertOnce = (): Promise<InsertOutcome> =>
    db.$transaction(async (tx) => {
      const existing = await tx.consultationApplication.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true, createdAt: true },
      });
      if (existing) {
        return { id: existing.id, createdAt: existing.createdAt, replayed: true };
      }

      // 상담 유형은 관리자가 바꿀 수 있으므로 저장 직전에 쓰임 여부를 다시 확인한다.
      const type = await tx.consultationTypeOption.findUnique({
        where: { id: input.consultationTypeId },
        select: { id: true, isActive: true },
      });
      if (!type || !type.isActive) {
        throw validationFailed({
          consultationTypeId: ["선택할 수 없는 상담 유형입니다."],
        });
      }

      const created = await tx.consultationApplication.create({
        data: {
          guardianName: input.guardianName,
          guardianPhone: input.guardianPhone,
          studentGrade: input.studentGrade,
          consultationTypeId: input.consultationTypeId,
          inquiry: input.inquiry ?? null,
          privacyConsentAt: new Date(),
          retentionPolicyVersion,
          idempotencyKey: input.idempotencyKey,
        },
        select: { id: true, createdAt: true },
      });

      return { id: created.id, createdAt: created.createdAt, replayed: false };
    });

  let result: InsertOutcome;
  try {
    result = await insertOnce();
  } catch (error) {
    // 같은 key 가 동시에 들어오면 한쪽이 유일 제약에 걸린다. 먼저 저장된 건을 돌려준다.
    if (!isUniqueViolation(error)) throw error;

    const saved = await db.consultationApplication.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, createdAt: true },
    });
    if (!saved) throw error;
    result = { id: saved.id, createdAt: saved.createdAt, replayed: true };
  }

  if (!result.replayed) {
    await notifyQuietly({
      channel: "staff",
      text: "새 입학진단·상담 신청 1건이 접수되었습니다.",
    });
  }

  return {
    id: result.id,
    replayed: result.replayed,
    createdAt: result.createdAt.toISOString(),
  };
}

function consultationWhere(filter: ConsultationExportInput) {
  const createdAt =
    filter.from || filter.to
      ? {
          ...(filter.from ? { gte: filter.from } : {}),
          ...(filter.to ? { lte: filter.to } : {}),
        }
      : undefined;

  return {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.consultationTypeId
      ? { consultationTypeId: filter.consultationTypeId }
      : {}),
    ...(createdAt ? { createdAt } : {}),
    // EV-ADM-08 의 검색은 학부모 성함이고, 연락처 검색은 사용자 지시로 함께 받는다.
    ...(filter.keyword
      ? {
          OR: [
            { guardianName: { contains: filter.keyword } },
            { guardianPhone: { contains: filter.keyword } },
          ],
        }
      : {}),
  };
}

/** AD-009 관리자 목록. 이름·연락처는 기본으로 가린다. 상단 건수는 필터와 무관한 전체 집계다. */
export async function listConsultationApplications(
  filter: ConsultationFilterInput,
): Promise<AdminConsultationList> {
  const where = consultationWhere(filter);
  const skip = (filter.page - 1) * filter.pageSize;

  const [total, rows, grouped] = await Promise.all([
    db.consultationApplication.count({ where }),
    db.consultationApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: filter.pageSize,
      include: { consultationType: { select: { label: true } } },
    }),
    db.consultationApplication.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countOf = (status: string) =>
    grouped.find((group) => group.status === status)?._count._all ?? 0;

  const items: AdminConsultationRow[] = rows.map((row) => ({
    id: row.id,
    maskedGuardianName: maskName(row.guardianName),
    maskedGuardianPhone: maskPhone(row.guardianPhone),
    studentGrade: row.studentGrade,
    consultationType: row.consultationType.label,
    hasInquiry: Boolean(row.inquiry && row.inquiry.length > 0),
    status: row.status,
    appliedAt: row.createdAt.toISOString(),
    purgeEligibleAt: row.purgeEligibleAt?.toISOString() ?? null,
  }));

  return {
    items,
    total,
    page: filter.page,
    pageSize: filter.pageSize,
    counts: {
      total: grouped.reduce((sum, group) => sum + group._count._all, 0),
      pending: countOf("PENDING"),
      completed: countOf("COMPLETED"),
      cancelled: countOf("CANCELLED"),
    },
  };
}

export type RevealedConsultation = {
  id: string;
  guardianName: string;
  guardianPhone: string;
  studentGrade: string;
  consultationType: string;
  inquiry: string | null;
  status: string;
  appliedAt: string;
  privacyConsentAt: string;
  retentionPolicyVersion: string;
  auditId: string;
};

/** AD-013 원문 조회. 조회 자체를 기록에 남긴다. */
export async function revealConsultationApplication(
  actorUserId: string,
  applicationId: string,
): Promise<RevealedConsultation> {
  const row = await db.consultationApplication.findUnique({
    where: { id: applicationId },
    include: { consultationType: { select: { label: true } } },
  });
  if (!row) throw notFound();

  const audit = await writeAuditLog({
    actorUserId,
    action: "PII_VIEW",
    resourceType: "ConsultationApplication",
    resourceId: row.id,
  });

  return {
    id: row.id,
    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,
    studentGrade: row.studentGrade,
    consultationType: row.consultationType.label,
    inquiry: row.inquiry,
    status: row.status,
    appliedAt: row.createdAt.toISOString(),
    privacyConsentAt: row.privacyConsentAt.toISOString(),
    retentionPolicyVersion: row.retentionPolicyVersion,
    auditId: audit.id,
  };
}

/** EV-ADM-08 `선택수정`: 고른 건의 처리 상태를 한 번에 바꾼다. */
export async function changeConsultationStatus(
  actorUserId: string,
  input: ConsultationStatusChangeInput,
): Promise<{ updated: number }> {
  const result = await db.consultationApplication.updateMany({
    where: { id: { in: input.applicationIds } },
    data: { status: input.status },
  });

  await writeAuditLog({
    actorUserId,
    action: "MEMBER_STATUS_CHANGE",
    resourceType: "ConsultationApplication",
    filterSummary: `status=${input.status};count=${result.count}`,
  });

  return { updated: result.count };
}

/** EV-ADM-08 `선택삭제`: 행 자체를 지운다. 삭제도 기록에 남긴다. (AD-013) */
export async function deleteConsultationApplications(
  actorUserId: string,
  input: ConsultationDeleteInput,
): Promise<{ deleted: number }> {
  const result = await db.consultationApplication.deleteMany({
    where: { id: { in: input.applicationIds } },
  });

  await writeAuditLog({
    actorUserId,
    action: "PII_PURGE",
    resourceType: "ConsultationApplication",
    filterSummary: `deleted=${result.count}`,
  });

  return { deleted: result.count };
}

/** AD-013 현재 필터 결과 전체 CSV. 내보내기를 기록에 남긴다. (ASM-006) */
export async function exportConsultationsCsv(
  actorUserId: string,
  filter: ConsultationExportInput,
): Promise<{ csv: string; rowCount: number; auditId: string }> {
  const rows = await db.consultationApplication.findMany({
    where: consultationWhere(filter),
    orderBy: { createdAt: "desc" },
    include: { consultationType: { select: { label: true } } },
  });

  const csv = csvRows(
    [
      "신청ID",
      "학부모 성함",
      "연락처",
      "학생 학년",
      "상담 유형",
      "문의 내용",
      "처리 상태",
      "신청일시",
    ],
    rows.map((row) => [
      row.id,
      row.guardianName,
      row.guardianPhone,
      row.studentGrade,
      row.consultationType.label,
      row.inquiry ?? "",
      CONSULTATION_STATUS_LABELS[row.status],
      row.createdAt.toISOString(),
    ]),
  );

  const audit = await writeAuditLog({
    actorUserId,
    action: "CSV_EXPORT",
    resourceType: "ConsultationApplication",
    filterSummary: summarizeFilter(
      {
        status: filter.status,
        keyword: filter.keyword,
        consultationTypeId: filter.consultationTypeId,
        from: filter.from,
        to: filter.to,
      },
      rows.length,
    ),
  });

  return { csv, rowCount: rows.length, auditId: audit.id };
}

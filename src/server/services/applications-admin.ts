import "@/server/server-only";
import type { Prisma } from "@prisma/client";
import {
  maskName,
  maskPhone,
  maskSchoolName,
  type AdminApplicationList,
  type AdminApplicationRow,
  type ApplicationExportInput,
  type ApplicationFilterInput,
  type ApplicationRevealInput,
  type EventReservationTotals,
} from "@/lib/contracts";
import { db } from "@/server/db";
import { notFound } from "@/server/errors";
import { summarizeFilter, writeAuditLog } from "@/server/services/audit";

type CourseWhere = Prisma.CourseApplicationWhereInput;
type EventWhere = Prisma.EventReservationWhereInput;

function dateRange(
  from: Date | undefined,
  to: Date | undefined,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
}

function courseWhere(filter: ApplicationExportInput): CourseWhere {
  const createdAt = dateRange(filter.from, filter.to);
  return {
    ...(filter.courseId ? { courseId: filter.courseId } : {}),
    ...(filter.campusId ? { course: { campusId: filter.campusId } } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.grade ? { grade: filter.grade } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
}

function eventWhere(filter: ApplicationExportInput): EventWhere {
  const createdAt = dateRange(filter.from, filter.to);
  return {
    ...(filter.eventId ? { eventId: filter.eventId } : {}),
    ...(filter.campusId ? { event: { campusId: filter.campusId } } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.grade ? { grade: filter.grade } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
}

/** 감사기록에 쓰는 필터 요약. 값은 넣지 않고 쓰인 필터 이름만 넣는다. (AD-013) */
function filterNames(filter: ApplicationExportInput): Record<string, unknown> {
  return {
    kind: filter.kind,
    campusId: filter.campusId,
    courseId: filter.courseId,
    eventId: filter.eventId,
    status: filter.status,
    grade: filter.grade,
    from: filter.from,
    to: filter.to,
  };
}

/** AD-005 / AD-008 신청·예약 목록. 이름·연락처는 기본으로 가린다. */
export async function listApplications(
  filter: ApplicationFilterInput,
): Promise<AdminApplicationList> {
  const skip = (filter.page - 1) * filter.pageSize;

  if (filter.kind === "course") {
    const where = courseWhere(filter);
    const [total, rows] = await Promise.all([
      db.courseApplication.count({ where }),
      db.courseApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: filter.pageSize,
        include: {
          course: { select: { title: true, campus: { select: { name: true } } } },
        },
      }),
    ]);

    const items: AdminApplicationRow[] = rows.map((row) => ({
      kind: "course",
      id: row.id,
      maskedName: maskName(row.studentName),
      maskedPhone: maskPhone(row.guardianPhone),
      status: row.status,
      title: row.course.title,
      campusName: row.course.campus.name,
      grade: row.grade,
      department: row.department,
      attendeeCount: null,
      appliedAt: row.createdAt.toISOString(),
      purgeEligibleAt: row.purgeEligibleAt?.toISOString() ?? null,
    }));

    return { items, total, page: filter.page, pageSize: filter.pageSize };
  }

  const where = eventWhere(filter);
  const [total, rows] = await Promise.all([
    db.eventReservation.count({ where }),
    db.eventReservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: filter.pageSize,
      include: {
        event: { select: { title: true, campus: { select: { name: true } } } },
      },
    }),
  ]);

  const items: AdminApplicationRow[] = rows.map((row) => ({
    kind: "event",
    id: row.id,
    maskedName: maskName(row.name),
    maskedPhone: maskPhone(row.phone),
    status: row.status,
    title: row.event.title,
    campusName: row.event.campus?.name ?? null,
    grade: row.grade,
    department: null,
    attendeeCount: row.attendeeCount,
    appliedAt: row.createdAt.toISOString(),
    purgeEligibleAt: row.purgeEligibleAt?.toISOString() ?? null,
  }));

  return { items, total, page: filter.page, pageSize: filter.pageSize };
}

export type RevealedApplication = {
  kind: "course" | "event";
  id: string;
  name: string;
  phone: string;
  schoolName: string | null;
  department: string | null;
  grade: string;
  attendeeCount: number | null;
  title: string;
  status: string;
  appliedAt: string;
  privacyConsentAt: string;
  retentionPolicyVersion: string;
  auditId: string;
};

/** AD-013 원문(마스킹 해제) 조회. 조회 자체를 기록에 남긴다. */
export async function revealApplication(
  actorUserId: string,
  input: ApplicationRevealInput,
): Promise<RevealedApplication> {
  if (input.kind === "course") {
    const row = await db.courseApplication.findUnique({
      where: { id: input.applicationId },
      include: { course: { select: { title: true } } },
    });
    if (!row) throw notFound();

    const audit = await writeAuditLog({
      actorUserId,
      action: "PII_VIEW",
      resourceType: "CourseApplication",
      resourceId: row.id,
    });

    return {
      kind: "course",
      id: row.id,
      name: row.studentName,
      phone: row.guardianPhone,
      schoolName: row.schoolName,
      department: row.department,
      grade: row.grade,
      attendeeCount: null,
      title: row.course.title,
      status: row.status,
      appliedAt: row.createdAt.toISOString(),
      privacyConsentAt: row.privacyConsentAt.toISOString(),
      retentionPolicyVersion: row.retentionPolicyVersion,
      auditId: audit.id,
    };
  }

  const row = await db.eventReservation.findUnique({
    where: { id: input.applicationId },
    include: { event: { select: { title: true } } },
  });
  if (!row) throw notFound();

  const audit = await writeAuditLog({
    actorUserId,
    action: "PII_VIEW",
    resourceType: "EventReservation",
    resourceId: row.id,
  });

  return {
    kind: "event",
    id: row.id,
    name: row.name,
    phone: row.phone,
    schoolName: null,
    department: null,
    grade: row.grade,
    attendeeCount: row.attendeeCount,
    title: row.event.title,
    status: row.status,
    appliedAt: row.createdAt.toISOString(),
    privacyConsentAt: row.privacyConsentAt.toISOString(),
    retentionPolicyVersion: row.retentionPolicyVersion,
    auditId: audit.id,
  };
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function csvRows(header: string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export type CsvExportResult = {
  csv: string;
  rowCount: number;
  auditId: string;
};

/**
 * AD-013 현재 필터 결과 **전체**를 CSV로 내보낸다. 페이지 범위가 아니다. (ASM-006)
 * 내보내기도 기록에 남기며, 기록에는 필터 이름과 건수만 담는다.
 */
export async function exportApplicationsCsv(
  actorUserId: string,
  filter: ApplicationExportInput,
): Promise<CsvExportResult> {
  let csv: string;
  let rowCount: number;

  if (filter.kind === "course") {
    const rows = await db.courseApplication.findMany({
      where: courseWhere(filter),
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { title: true, campus: { select: { name: true } } } },
      },
    });
    rowCount = rows.length;
    csv = csvRows(
      [
        "구분",
        "신청ID",
        "지점",
        "강좌",
        "학생이름",
        "보호자연락처",
        "학교",
        "과정",
        "학년",
        "상태",
        "신청일시",
      ],
      rows.map((row) => [
        "강좌",
        row.id,
        row.course.campus.name,
        row.course.title,
        row.studentName,
        row.guardianPhone,
        row.schoolName,
        row.department,
        row.grade,
        row.status,
        row.createdAt.toISOString(),
      ]),
    );
  } else {
    const rows = await db.eventReservation.findMany({
      where: eventWhere(filter),
      orderBy: { createdAt: "desc" },
      include: {
        event: { select: { title: true, campus: { select: { name: true } } } },
      },
    });
    rowCount = rows.length;
    csv = csvRows(
      [
        "구분",
        "예약ID",
        "지점",
        "설명회",
        "이름",
        "연락처",
        "학년",
        "참석인원",
        "상태",
        "신청일시",
      ],
      rows.map((row) => [
        "설명회",
        row.id,
        row.event.campus?.name ?? "",
        row.event.title,
        row.name,
        row.phone,
        row.grade,
        String(row.attendeeCount),
        row.status,
        row.createdAt.toISOString(),
      ]),
    );
  }

  const audit = await writeAuditLog({
    actorUserId,
    action: "CSV_EXPORT",
    resourceType: filter.kind === "course" ? "CourseApplication" : "EventReservation",
    filterSummary: summarizeFilter(filterNames(filter), rowCount),
  });

  return { csv, rowCount, auditId: audit.id };
}

/**
 * AD-005 설명회 집계. 예약 건수와 참석 인원 합계를 따로 센다. (EV-ADM-03)
 * 취소된 예약은 두 숫자 모두에서 뺀다.
 */
export async function getEventReservationTotals(
  eventId: string,
): Promise<EventReservationTotals> {
  const aggregate = await db.eventReservation.aggregate({
    where: { eventId, status: { not: "CANCELLED" } },
    _count: { _all: true },
    _sum: { attendeeCount: true },
  });

  return {
    eventId,
    reservationCount: aggregate._count._all,
    attendeeTotal: aggregate._sum.attendeeCount ?? 0,
  };
}

export type MaskedApplicationDetail = {
  kind: "course" | "event";
  id: string;
  maskedName: string;
  maskedPhone: string;
  maskedSchoolName: string | null;
  department: string | null;
  grade: string;
  attendeeCount: number | null;
  title: string;
  campusName: string | null;
  status: string;
  appliedAt: string;
  purgeEligibleAt: string | null;
};

/**
 * 관리자 상세 화면의 기본 보기. 원문 조회(reveal) 전에는 학교명까지 가린다.
 * 이 조회는 개인정보 원문을 보여 주지 않으므로 감사기록 대상이 아니다. (AD-013)
 */
export async function getMaskedApplicationDetail(
  kind: "course" | "event",
  applicationId: string,
): Promise<MaskedApplicationDetail> {
  if (kind === "course") {
    const row = await db.courseApplication.findUnique({
      where: { id: applicationId },
      include: {
        course: { select: { title: true, campus: { select: { name: true } } } },
      },
    });
    if (!row) throw notFound();

    return {
      kind: "course",
      id: row.id,
      maskedName: maskName(row.studentName),
      maskedPhone: maskPhone(row.guardianPhone),
      maskedSchoolName: maskSchoolName(row.schoolName),
      department: row.department,
      grade: row.grade,
      attendeeCount: null,
      title: row.course.title,
      campusName: row.course.campus.name,
      status: row.status,
      appliedAt: row.createdAt.toISOString(),
      purgeEligibleAt: row.purgeEligibleAt?.toISOString() ?? null,
    };
  }

  const row = await db.eventReservation.findUnique({
    where: { id: applicationId },
    include: { event: { select: { title: true, campus: { select: { name: true } } } } },
  });
  if (!row) throw notFound();

  return {
    kind: "event",
    id: row.id,
    maskedName: maskName(row.name),
    maskedPhone: maskPhone(row.phone),
    maskedSchoolName: null,
    department: null,
    grade: row.grade,
    attendeeCount: row.attendeeCount,
    title: row.event.title,
    campusName: row.event.campus?.name ?? null,
    status: row.status,
    appliedAt: row.createdAt.toISOString(),
    purgeEligibleAt: row.purgeEligibleAt?.toISOString() ?? null,
  };
}

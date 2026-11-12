import "server-only";
import { createHash } from "node:crypto";
import type { PrivacyRetentionSetting, Prisma } from "@prisma/client";
import {
  COURSE_PRIVACY_CONSENT,
  EVENT_PRIVACY_CONSENT,
  type PrivacyRetentionSettingInput,
  type PurgeEligibilityInput,
} from "@/lib/contracts";
import { db, isUniqueViolation } from "@/server/db";
import { summarizeFilter, writeAuditLog } from "@/server/services/audit";

/** 파기한 개인정보 칸에 넣는 비식별 값. 행 자체는 남긴다. (BLUEPRINT 6장) */
export const PURGED_PLACEHOLDER = "파기됨";

type DbClient = Prisma.TransactionClient | typeof db;

/**
 * 보존 설정은 한 행만 쓴다. 기본 문구는 레거시 동의 문구(EV-0006)와 같은 값을 쓴다.
 * (ASM-009, BZ-002)
 */
export async function getRetentionSetting(
  client: DbClient = db,
): Promise<PrivacyRetentionSetting> {
  const existing = await client.privacyRetentionSetting.findUnique({
    where: { id: 1 },
  });
  if (existing) return existing;

  try {
    return await client.privacyRetentionSetting.create({
      data: {
        id: 1,
        courseRetentionPolicy: COURSE_PRIVACY_CONSENT.retention,
        // 설명회는 설명회 문구를 기본값으로 쓴다. 강좌 문구를 넣으면 신청자가 본 문구와
        // 저장된 정책 버전이 달라진다. (BZ-002, ASM-009)
        eventRetentionPolicy: EVENT_PRIVACY_CONSENT.retention,
        automaticPurgeEnabled: false,
      },
    });
  } catch (error) {
    // 두 신청이 동시에 들어와 기본 행을 함께 만들려 하면 한쪽이 유일 제약에 걸린다.
    // 이때는 먼저 만들어진 행을 읽어 쓴다.
    if (!isUniqueViolation(error)) throw error;
    return client.privacyRetentionSetting.findUniqueOrThrow({ where: { id: 1 } });
  }
}

/**
 * 접수 당시 보존 정책 버전. 문구가 기본값이면 관찰된 버전 ID를 쓰고,
 * 관리자가 바꾼 뒤에는 문구에서 나온 결정적 버전 값을 쓴다.
 *
 * 비교 대상은 **종류별 기본 문구**다. 강좌 기본값과만 비교하면 설명회 예약이
 * 신청자가 보지 않은 문구의 버전을 저장한다. (BZ-002)
 */
export function resolveRetentionPolicyVersion(
  kind: "course" | "event",
  setting: PrivacyRetentionSetting,
): string {
  const policy =
    kind === "course" ? setting.courseRetentionPolicy : setting.eventRetentionPolicy;
  const defaultPolicy =
    kind === "course"
      ? COURSE_PRIVACY_CONSENT.retention
      : EVENT_PRIVACY_CONSENT.retention;
  const defaultVersion =
    kind === "course"
      ? COURSE_PRIVACY_CONSENT.policyVersion
      : EVENT_PRIVACY_CONSENT.policyVersion;
  if (policy === defaultPolicy) {
    return defaultVersion;
  }
  const digest = createHash("sha256").update(policy).digest("hex").slice(0, 12);
  return `custom-${digest}`;
}

export async function updateRetentionSetting(
  actorUserId: string,
  input: PrivacyRetentionSettingInput,
): Promise<PrivacyRetentionSetting> {
  await getRetentionSetting();
  const updated = await db.privacyRetentionSetting.update({
    where: { id: 1 },
    data: {
      courseRetentionPolicy: input.courseRetentionPolicy,
      eventRetentionPolicy: input.eventRetentionPolicy,
      automaticPurgeEnabled: input.automaticPurgeEnabled,
      updatedByUserId: actorUserId,
    },
  });

  await writeAuditLog({
    actorUserId,
    action: "RETENTION_SETTING_CHANGE",
    resourceType: "PrivacyRetentionSetting",
    resourceId: "1",
    filterSummary: `automaticPurgeEnabled=${updated.automaticPurgeEnabled}`,
  });

  return updated;
}

export async function isAutomaticPurgeEnabled(): Promise<boolean> {
  const setting = await getRetentionSetting();
  return setting.automaticPurgeEnabled;
}

/** 강좌 종강·설명회 종료 안내가 끝난 건에 파기 대상 시각을 설정한다. (ASM-009) */
export async function setPurgeEligibility(
  actorUserId: string,
  input: PurgeEligibilityInput,
): Promise<{ updated: number; auditId: string }> {
  const where = { id: { in: input.applicationIds }, purgedAt: null };
  const result =
    input.kind === "course"
      ? await db.courseApplication.updateMany({
          where,
          data: { purgeEligibleAt: input.purgeEligibleAt },
        })
      : await db.eventReservation.updateMany({
          where,
          data: { purgeEligibleAt: input.purgeEligibleAt },
        });

  const audit = await writeAuditLog({
    actorUserId,
    action: "PURGE_SCHEDULE_SET",
    resourceType: input.kind === "course" ? "CourseApplication" : "EventReservation",
    filterSummary: summarizeFilter(
      { kind: input.kind, applicationIds: true },
      result.count,
    ),
  });

  return { updated: result.count, auditId: audit.id };
}

export type PurgeResult = {
  dryRun: boolean;
  courseApplications: number;
  eventReservations: number;
  auditId: string | null;
};

/**
 * 보존 기간이 지난 기록의 개인정보 칸을 비식별화한다. 행은 지우지 않는다.
 * `dryRun`이면 건수만 센다. 실제 파기만 감사기록을 남긴다. (AD-013)
 */
export async function runPurge(options: {
  actorUserId: string | null;
  dryRun: boolean;
  now?: Date;
}): Promise<PurgeResult> {
  const now = options.now ?? new Date();
  const target = { purgeEligibleAt: { lte: now }, purgedAt: null };

  if (options.dryRun) {
    const [courseApplications, eventReservations] = await Promise.all([
      db.courseApplication.count({ where: target }),
      db.eventReservation.count({ where: target }),
    ]);
    return { dryRun: true, courseApplications, eventReservations, auditId: null };
  }

  const [courses, events] = await db.$transaction(async (tx) => {
    const courseResult = await tx.courseApplication.updateMany({
      where: target,
      data: {
        studentName: PURGED_PLACEHOLDER,
        guardianPhone: PURGED_PLACEHOLDER,
        schoolName: PURGED_PLACEHOLDER,
        purgedAt: now,
      },
    });
    const eventResult = await tx.eventReservation.updateMany({
      where: target,
      data: {
        name: PURGED_PLACEHOLDER,
        phone: PURGED_PLACEHOLDER,
        purgedAt: now,
      },
    });
    return [courseResult, eventResult] as const;
  });

  const audit = await writeAuditLog({
    actorUserId: options.actorUserId,
    action: "PII_PURGE",
    resourceType: "ApplicationPii",
    filterSummary: `course=${courses.count};event=${events.count}`,
  });

  return {
    dryRun: false,
    courseApplications: courses.count,
    eventReservations: events.count,
    auditId: audit.id,
  };
}

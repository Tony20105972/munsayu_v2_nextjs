import "server-only";
import { createHash } from "node:crypto";
import type { PrivacyRetentionSetting, Prisma } from "@prisma/client";
import {
  CONSULTATION_PRIVACY_CONSENT,
  COURSE_PRIVACY_CONSENT,
  EVENT_PRIVACY_CONSENT,
  INSTRUCTOR_PRIVACY_CONSENT,
  SMS_SUBSCRIPTION_CONSENT,
  type PrivacyRetentionSettingInput,
  type PurgeEligibilityInput,
} from "@/lib/contracts";
import { db, isUniqueViolation } from "@/server/db";
import { getStorageAdapter } from "@/server/adapters/storage";
import { summarizeFilter, writeAuditLog } from "@/server/services/audit";

/** 보존 정책 문구를 쓰는 신청 종류. 종류마다 신청자가 본 문구가 다르다. (BZ-002) */
export type RetentionKind = "course" | "event" | "consultation" | "instructor" | "sms";

const DEFAULT_POLICIES: Record<RetentionKind, { retention: string; version: string }> =
  {
    course: {
      retention: COURSE_PRIVACY_CONSENT.retention,
      version: COURSE_PRIVACY_CONSENT.policyVersion,
    },
    event: {
      retention: EVENT_PRIVACY_CONSENT.retention,
      version: EVENT_PRIVACY_CONSENT.policyVersion,
    },
    consultation: {
      retention: CONSULTATION_PRIVACY_CONSENT.retention,
      version: CONSULTATION_PRIVACY_CONSENT.policyVersion,
    },
    instructor: {
      retention: INSTRUCTOR_PRIVACY_CONSENT.retention,
      version: INSTRUCTOR_PRIVACY_CONSENT.policyVersion,
    },
    sms: {
      retention: SMS_SUBSCRIPTION_CONSENT.retention,
      version: SMS_SUBSCRIPTION_CONSENT.policyVersion,
    },
  };

type PolicyColumn =
  | "courseRetentionPolicy"
  | "eventRetentionPolicy"
  | "consultationRetentionPolicy"
  | "instructorRetentionPolicy"
  | "smsRetentionPolicy";

const POLICY_COLUMNS: Record<RetentionKind, PolicyColumn> = {
  course: "courseRetentionPolicy",
  event: "eventRetentionPolicy",
  consultation: "consultationRetentionPolicy",
  instructor: "instructorRetentionPolicy",
  sms: "smsRetentionPolicy",
};

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
  if (existing) return backfillPolicies(existing, client);

  try {
    return await client.privacyRetentionSetting.create({
      data: {
        id: 1,
        courseRetentionPolicy: COURSE_PRIVACY_CONSENT.retention,
        // 종류마다 신청자가 본 문구를 기본값으로 쓴다. 한 문구를 돌려 쓰면 저장된
        // 정책 버전이 신청자가 본 문구와 달라진다. (BZ-002, ASM-009)
        eventRetentionPolicy: EVENT_PRIVACY_CONSENT.retention,
        consultationRetentionPolicy: CONSULTATION_PRIVACY_CONSENT.retention,
        instructorRetentionPolicy: INSTRUCTOR_PRIVACY_CONSENT.retention,
        smsRetentionPolicy: SMS_SUBSCRIPTION_CONSENT.retention,
        automaticPurgeEnabled: false,
      },
    });
  } catch (error) {
    // 두 신청이 동시에 들어와 기본 행을 함께 만들려 하면 한쪽이 유일 제약에 걸린다.
    // 이때는 먼저 만들어진 행을 읽어 쓴다.
    if (!isUniqueViolation(error)) throw error;
    return backfillPolicies(
      await client.privacyRetentionSetting.findUniqueOrThrow({ where: { id: 1 } }),
      client,
    );
  }
}

/**
 * Phase 5에서 늘어난 문구 칸은 기존 행에서 빈 문자열이다.
 * 빈 칸을 종류별 기본 문구로 한 번 채워 둔다. 관리자가 적은 문구는 건드리지 않는다.
 */
async function backfillPolicies(
  setting: PrivacyRetentionSetting,
  client: DbClient,
): Promise<PrivacyRetentionSetting> {
  const patch: Partial<Record<PolicyColumn, string>> = {};
  for (const kind of ["consultation", "instructor", "sms"] as const) {
    const column = POLICY_COLUMNS[kind];
    if (!setting[column]) {
      patch[column] = DEFAULT_POLICIES[kind].retention;
    }
  }
  if (Object.keys(patch).length === 0) return setting;

  return client.privacyRetentionSetting.update({ where: { id: 1 }, data: patch });
}

/**
 * 접수 당시 보존 정책 버전. 문구가 기본값이면 관찰된 버전 ID를 쓰고,
 * 관리자가 바꾼 뒤에는 문구에서 나온 결정적 버전 값을 쓴다.
 *
 * 비교 대상은 **종류별 기본 문구**다. 강좌 기본값과만 비교하면 설명회 예약이
 * 신청자가 보지 않은 문구의 버전을 저장한다. (BZ-002)
 */
export function resolveRetentionPolicyVersion(
  kind: RetentionKind,
  setting: PrivacyRetentionSetting,
): string {
  const policy = setting[POLICY_COLUMNS[kind]] ?? "";
  const { retention: defaultPolicy, version: defaultVersion } = DEFAULT_POLICIES[kind];
  if (policy === "" || policy === defaultPolicy) {
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
      consultationRetentionPolicy: input.consultationRetentionPolicy,
      instructorRetentionPolicy: input.instructorRetentionPolicy,
      smsRetentionPolicy: input.smsRetentionPolicy,
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

/** 안내가 끝난 건에 파기 대상 시각을 설정한다. 종류마다 대상 표가 다르다. (ASM-009) */
export async function setPurgeEligibility(
  actorUserId: string,
  input: PurgeEligibilityInput,
): Promise<{ updated: number; auditId: string }> {
  const where = { id: { in: input.applicationIds }, purgedAt: null };
  const data = { purgeEligibleAt: input.purgeEligibleAt };

  const result = await (async () => {
    switch (input.kind) {
      case "course":
        return db.courseApplication.updateMany({ where, data });
      case "event":
        return db.eventReservation.updateMany({ where, data });
      case "consultation":
        return db.consultationApplication.updateMany({ where, data });
      case "instructor":
        return db.instructorApplication.updateMany({ where, data });
      case "sms":
        return db.smsSubscription.updateMany({ where, data });
    }
  })();

  const audit = await writeAuditLog({
    actorUserId,
    action: "PURGE_SCHEDULE_SET",
    resourceType: PURGE_RESOURCE_TYPES[input.kind],
    filterSummary: summarizeFilter(
      { kind: input.kind, applicationIds: true },
      result.count,
    ),
  });

  return { updated: result.count, auditId: audit.id };
}

const PURGE_RESOURCE_TYPES: Record<RetentionKind, string> = {
  course: "CourseApplication",
  event: "EventReservation",
  consultation: "ConsultationApplication",
  instructor: "InstructorApplication",
  sms: "SmsSubscription",
};

export type PurgeResult = {
  dryRun: boolean;
  courseApplications: number;
  eventReservations: number;
  consultationApplications: number;
  instructorApplications: number;
  smsSubscriptions: number;
  /** 함께 지운 제출 서류 수. (AD-011) */
  removedFiles: number;
  auditId: string | null;
};

/**
 * 보존 기간이 지난 기록의 개인정보 칸을 비식별화한다. 행은 지우지 않는다.
 * 강사 지원은 저장된 제출 서류 파일도 함께 지운다. (사용자 지시 2026-11-12)
 * `dryRun` 이면 건수만 센다. 실제 파기만 감사기록을 남긴다. (AD-013)
 */
export async function runPurge(options: {
  actorUserId: string | null;
  dryRun: boolean;
  now?: Date;
}): Promise<PurgeResult> {
  const now = options.now ?? new Date();
  const target = { purgeEligibleAt: { lte: now }, purgedAt: null };

  if (options.dryRun) {
    const [
      courseApplications,
      eventReservations,
      consultationApplications,
      instructorApplications,
      smsSubscriptions,
    ] = await Promise.all([
      db.courseApplication.count({ where: target }),
      db.eventReservation.count({ where: target }),
      db.consultationApplication.count({ where: target }),
      db.instructorApplication.count({ where: target }),
      db.smsSubscription.count({ where: target }),
    ]);
    return {
      dryRun: true,
      courseApplications,
      eventReservations,
      consultationApplications,
      instructorApplications,
      smsSubscriptions,
      removedFiles: 0,
      auditId: null,
    };
  }

  // 파일 삭제는 트랜잭션으로 되돌릴 수 없다. 먼저 지울 키를 읽어 두고,
  // DB 를 먼저 비식별화한 다음 파일을 지운다. 이렇게 해야 DB 가 실패했을 때
  // 아직 유효한 기록의 파일을 지우는 일이 생기지 않는다.
  const resumeTargets = await db.instructorApplication.findMany({
    where: target,
    select: { resumeStorageKey: true, portfolioStorageKey: true },
  });

  const [courses, events, consultations, instructors, subscriptions] =
    await db.$transaction(async (tx) => {
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
      const consultationResult = await tx.consultationApplication.updateMany({
        where: target,
        data: {
          guardianName: PURGED_PLACEHOLDER,
          guardianPhone: PURGED_PLACEHOLDER,
          inquiry: null,
          purgedAt: now,
        },
      });
      // 제출 서류의 원래 파일 이름에도 실명이 들어 있을 수 있어 함께 지운다.
      const instructorResult = await tx.instructorApplication.updateMany({
        where: target,
        data: {
          name: PURGED_PLACEHOLDER,
          phone: PURGED_PLACEHOLDER,
          email: PURGED_PLACEHOLDER,
          education: PURGED_PLACEHOLDER,
          headline: null,
          careerDetail: null,
          coachingDetail: null,
          resumeFilename: PURGED_PLACEHOLDER,
          portfolioFilename: null,
          purgedAt: now,
        },
      });
      const smsResult = await tx.smsSubscription.updateMany({
        where: target,
        data: {
          studentName: PURGED_PLACEHOLDER,
          schoolName: PURGED_PLACEHOLDER,
          guardianPhone: PURGED_PLACEHOLDER,
          purgedAt: now,
        },
      });
      return [
        courseResult,
        eventResult,
        consultationResult,
        instructorResult,
        smsResult,
      ] as const;
    });

  const storage = getStorageAdapter();
  let removedFiles = 0;
  for (const row of resumeTargets) {
    for (const key of [row.resumeStorageKey, row.portfolioStorageKey]) {
      if (!key) continue;
      await storage.remove("private", key);
      removedFiles += 1;
    }
  }

  const audit = await writeAuditLog({
    actorUserId: options.actorUserId,
    action: "PII_PURGE",
    resourceType: "ApplicationPii",
    filterSummary:
      `course=${courses.count};event=${events.count};` +
      `consultation=${consultations.count};instructor=${instructors.count};` +
      `sms=${subscriptions.count};files=${removedFiles}`,
  });

  return {
    dryRun: false,
    courseApplications: courses.count,
    eventReservations: events.count,
    consultationApplications: consultations.count,
    instructorApplications: instructors.count,
    smsSubscriptions: subscriptions.count,
    removedFiles,
    auditId: audit.id,
  };
}

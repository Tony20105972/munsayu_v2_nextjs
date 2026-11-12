import { z } from "zod";
import {
  cuidLikeIdSchema,
  paginationSchema,
  personNameSchema,
  phoneSchema,
} from "./common";
import { ACCOUNT_STATUSES, emailSchema, loginIdSchema, passwordSchema } from "./auth";
import { elementaryGradeSchema } from "./applications";

/**
 * 관리자 기능(AD-002~AD-008, AD-012, AD-013)의 입력 계약.
 * 역할은 단일 ADMIN이고 권한은 매 요청 서버에서 확인한다. (D5, BLUEPRINT 7장)
 */

/** 설명회 상태 목록은 데이터로 관리하고 관리자가 직접 바꾼다. 자동 전환은 없다. (ASM-001) */
export const DEFAULT_EVENT_STATUS_LABELS = ["접수중", "마감임박", "접수마감"] as const;

export const eventStatusOptionSchema = z.object({
  label: z.string().trim().min(1).max(20),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  /** true면 새 예약을 받지 않는다. */
  isClosed: z.coerce.boolean().default(false),
});
export type EventStatusOptionInput = z.infer<typeof eventStatusOptionSchema>;

/** 관리코드는 자동 생성하되 관리자가 고칠 수 있다. (ASM-005) */
export const managementCodeSchema = z.string().trim().min(1).max(30);

export const eventUpsertSchema = z.object({
  campusId: cuidLikeIdSchema.nullable().default(null),
  managementCode: managementCodeSchema,
  title: z.string().trim().min(2).max(120),
  startsAt: z.coerce.date(),
  venue: z.string().trim().max(120).nullable().default(null),
  speaker: z.string().trim().max(60).nullable().default(null),
  statusOptionId: cuidLikeIdSchema,
});
export type EventUpsertInput = z.infer<typeof eventUpsertSchema>;

export const eventStatusChangeSchema = z.object({
  eventId: cuidLikeIdSchema,
  statusOptionId: cuidLikeIdSchema,
});
export type EventStatusChangeInput = z.infer<typeof eventStatusChangeSchema>;

export const courseUpsertSchema = z.object({
  campusId: cuidLikeIdSchema,
  title: z.string().trim().min(2).max(120),
  sectionTitle: z.string().trim().max(120).nullable().default(null),
  gradeTitle: z.string().trim().max(60).nullable().default(null),
  scheduleText: z.string().trim().max(120).nullable().default(null),
  startDate: z.coerce.date().nullable().default(null),
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
  /** 강좌는 접수중/접수마감만 있고 관리자가 직접 바꾼다. (Q-ADM-05 답변) */
  intakeOpen: z.coerce.boolean().default(true),
});
export type CourseUpsertInput = z.infer<typeof courseUpsertSchema>;

export const courseIntakeChangeSchema = z.object({
  courseId: cuidLikeIdSchema,
  intakeOpen: z.coerce.boolean(),
});
export type CourseIntakeChangeInput = z.infer<typeof courseIntakeChangeSchema>;

export const instructorUpsertSchema = z.object({
  name: personNameSchema,
  profileCode: z.string().trim().min(1).max(40),
  bio: z.string().trim().max(2000).nullable().default(null),
  photoStorageKey: z.string().trim().max(200).nullable().default(null),
});
export type InstructorUpsertInput = z.infer<typeof instructorUpsertSchema>;

/** 팀 자체의 생성 입력. 팀은 이름만 갖는다. */
export const instructorTeamCreateSchema = z.object({
  name: z.string().trim().min(2).max(40),
});
export type InstructorTeamCreateInput = z.infer<typeof instructorTeamCreateSchema>;

/** 한 강사가 여러 팀에 소속될 수 있고 팀별 노출 순서를 둔다. (ASM-003) */
export const instructorTeamMembershipSchema = z.object({
  instructorId: cuidLikeIdSchema,
  teamId: cuidLikeIdSchema,
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
});
export type InstructorTeamMembershipInput = z.infer<
  typeof instructorTeamMembershipSchema
>;

/** 팀 소속 해제는 복합 키로 지정한다. */
export const instructorTeamMembershipDeleteSchema = z.object({
  instructorId: cuidLikeIdSchema,
  teamId: cuidLikeIdSchema,
});
export type InstructorTeamMembershipDeleteInput = z.infer<
  typeof instructorTeamMembershipDeleteSchema
>;

/** 관리자 강좌 목록 필터. `intakeOpen`은 쿼리 문자열이라 문자열에서 변환한다. */
export const adminCourseListSchema = paginationSchema.extend({
  campusId: cuidLikeIdSchema.optional(),
  intakeOpen: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type AdminCourseListInput = z.infer<typeof adminCourseListSchema>;

export const memberSearchSchema = paginationSchema.extend({
  /** 아이디 또는 이름 일부. 로그에는 남기지 않는다. */
  keyword: z.string().trim().max(40).optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
});
export type MemberSearchInput = z.infer<typeof memberSearchSchema>;

export const memberStatusChangeSchema = z.object({
  userId: cuidLikeIdSchema,
  status: z.enum(ACCOUNT_STATUSES),
});
export type MemberStatusChangeInput = z.infer<typeof memberStatusChangeSchema>;

/** 관리자가 관리자 계정을 추가·삭제한다. 역할 구분은 없다. (Q-ADM-10 답변, D5) */
export const adminAccountCreateSchema = z.object({
  loginId: loginIdSchema,
  password: passwordSchema,
  name: personNameSchema,
  email: emailSchema,
  phone: phoneSchema,
});
export type AdminAccountCreateInput = z.infer<typeof adminAccountCreateSchema>;

export const adminAccountDeleteSchema = z.object({ userId: cuidLikeIdSchema });
export type AdminAccountDeleteInput = z.infer<typeof adminAccountDeleteSchema>;

export const APPLICATION_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;

/** 신청 목록 필터. CSV는 이 필터 결과 전체를 내보낸다. (ASM-006) */
export const applicationFilterSchema = paginationSchema.extend({
  kind: z.enum(["course", "event"]).default("course"),
  campusId: cuidLikeIdSchema.optional(),
  courseId: cuidLikeIdSchema.optional(),
  eventId: cuidLikeIdSchema.optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  grade: elementaryGradeSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type ApplicationFilterInput = z.infer<typeof applicationFilterSchema>;

/** CSV 내보내기는 목록 필터와 같은 조건을 받고 감사기록을 남긴다. (AD-013, ASM-006) */
export const applicationExportSchema = applicationFilterSchema.omit({
  page: true,
  pageSize: true,
});
export type ApplicationExportInput = z.infer<typeof applicationExportSchema>;

/** 마스킹 상태의 단건 상세 조회. 원문 조회(reveal)와 달리 감사기록을 남기지 않는다. */
export const applicationDetailSchema = z.object({
  kind: z.enum(["course", "event"]),
  applicationId: cuidLikeIdSchema,
});
export type ApplicationDetailInput = z.infer<typeof applicationDetailSchema>;

/** 원문(마스킹 해제) 조회도 감사기록 대상이다. (AD-013) */
export const applicationRevealSchema = z.object({
  kind: z.enum(["course", "event"]),
  applicationId: cuidLikeIdSchema,
});
export type ApplicationRevealInput = z.infer<typeof applicationRevealSchema>;

/** 보존 설정의 표시 문구는 동의 문구와 같은 값을 쓴다. (ASM-009, BZ-002) */
export const privacyRetentionSettingSchema = z.object({
  courseRetentionPolicy: z.string().trim().min(2).max(200),
  eventRetentionPolicy: z.string().trim().min(2).max(200),
  /** 자동 파기 기본값은 꺼짐이다. */
  automaticPurgeEnabled: z.coerce.boolean().default(false),
});
export type PrivacyRetentionSettingInput = z.infer<
  typeof privacyRetentionSettingSchema
>;

/** 강좌 종강·설명회 종료 안내가 끝나면 관리자가 파기 대상 시각을 설정한다. (ASM-009) */
export const purgeEligibilitySchema = z.object({
  kind: z.enum(["course", "event"]),
  applicationIds: z.array(cuidLikeIdSchema).min(1).max(500),
  purgeEligibleAt: z.coerce.date(),
});
export type PurgeEligibilityInput = z.infer<typeof purgeEligibilitySchema>;

/** 수동 파기와 예약 실행 경로가 같은 입력을 쓴다. 예약 실행은 비밀값으로 보호한다. (AD-013) */
export const purgeRunSchema = z.object({
  /** true면 대상 건수만 세고 실제로 지우지 않는다. */
  dryRun: z.coerce.boolean().default(true),
});
export type PurgeRunInput = z.infer<typeof purgeRunSchema>;

export const AUDIT_ACTIONS = [
  "PII_VIEW",
  "CSV_EXPORT",
  "PII_PURGE",
  "PURGE_SCHEDULE_SET",
  "ADMIN_ACCOUNT_CREATE",
  "ADMIN_ACCOUNT_DELETE",
  "MEMBER_STATUS_CHANGE",
  "RETENTION_SETTING_CHANGE",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** 관리자 목록 1건. 이름·연락처는 기본으로 가린 값이다. (BLUEPRINT 10장) */
export type AdminApplicationRow = {
  kind: "course" | "event";
  id: string;
  maskedName: string;
  maskedPhone: string;
  status: (typeof APPLICATION_STATUSES)[number];
  title: string;
  campusName: string | null;
  grade: string;
  department: string | null;
  attendeeCount: number | null;
  appliedAt: string;
  purgeEligibleAt: string | null;
};

export type AdminApplicationList = {
  items: AdminApplicationRow[];
  total: number;
  page: number;
  pageSize: number;
};

/** AD-005 설명회 집계: 예약 건수와 참석 인원 합계를 따로 센다. (EV-ADM-03) */
export type EventReservationTotals = {
  eventId: string;
  reservationCount: number;
  attendeeTotal: number;
};

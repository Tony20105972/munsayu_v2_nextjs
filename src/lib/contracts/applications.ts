import { z } from "zod";
import {
  cuidLikeIdSchema,
  idempotencyKeySchema,
  personNameSchema,
  phoneSchema,
  requiredConsentSchema,
} from "./common";

/**
 * FM-001 강좌 수강 신청 / FM-002 설명회 예약의 입력 계약.
 * 강좌 쪽 선택지와 동의 문구는 레거시 예약 모달 관찰값이다. (EV-0006, EV-0010)
 * 설명회 쪽은 레거시 폼을 관찰할 수 없어 신규 계약이다. (ASM-001, D9)
 */

/** 레거시 모달의 `희망 수강 과정` 라디오 값 3개. (EV-0006) */
export const COURSE_DEPARTMENTS = ["초등 문해력", "어휘·글쓰기", "진단평가"] as const;
export const courseDepartmentSchema = z.enum(COURSE_DEPARTMENTS);
export type CourseDepartment = (typeof COURSE_DEPARTMENTS)[number];

/** 레거시 모달의 `초등 학년 선택` 라디오 값 7개. (EV-0006) */
export const ELEMENTARY_GRADES = [
  "예비초",
  "초1",
  "초2",
  "초3",
  "초4",
  "초5",
  "초6",
] as const;
export const elementaryGradeSchema = z.enum(ELEMENTARY_GRADES);
export type ElementaryGrade = (typeof ELEMENTARY_GRADES)[number];

/** 한 예약에 넣을 수 있는 참석 인원 상한. 1건 최대 2명. (ASM-001, D9) */
export const EVENT_ATTENDEE_MAX = 2;

/** 레거시 동의 안내 문구 원문. 화면 표시와 저장 정책이 같은 값을 쓴다. (EV-0006, BZ-002) */
export const COURSE_PRIVACY_CONSENT = {
  heading: "개인정보 수집 및 동의 안내",
  purpose: "수강 신청반 좌석 배정 관리 및 예약 확정 안내 문자 발송",
  collectedItems: "이름, 휴대폰 번호, 학생 학교/학년/수강과정",
  retention: "해당 강좌 종강 및 정규 등록 안내 완료 시점 즉시 파기",
  checkboxLabel: "위 명시 사항에 동의합니다. (필수)",
  submitLabel: "수강 예약 신청서 제출하기",
  policyVersion: "legacy-ev-0006-v1",
} as const;

/**
 * 설명회 동의 안내 문구. 레거시 설명회 폼은 관찰하지 못했고(접수 가능한 일정 없음, EV-0005)
 * ASM-009에 따라 강좌 문구를 바탕으로 설명회에 맞게 목적·수집항목·보유기간만 바꿨다. // ASM-052
 * 보유기간 표시는 `PrivacyRetentionSetting`의 설정값과 같은 값을 쓴다. (BZ-002)
 */
export const EVENT_PRIVACY_CONSENT = {
  heading: COURSE_PRIVACY_CONSENT.heading,
  purpose: "설명회 좌석 배정 관리 및 예약 확정 안내",
  collectedItems: "이름, 휴대폰 번호, 학생 학년, 참석 인원",
  retention: "해당 설명회 종료 및 안내 완료 시점 즉시 파기",
  checkboxLabel: COURSE_PRIVACY_CONSENT.checkboxLabel,
  submitLabel: "설명회 예약 신청서 제출하기",
  // 문구가 강좌와 다르므로 버전도 따로 둔다. 동의 기록이 가리키는 문구가 신청자가 본 문구여야 한다.
  policyVersion: "event-asm-009-v1",
} as const;

export const courseApplicationSchema = z.object({
  courseId: cuidLikeIdSchema,
  /** 레거시 `rl_name` */
  studentName: personNameSchema,
  /** 레거시 `rl_hp` */
  guardianPhone: phoneSchema,
  /** 레거시 `rl_school` */
  schoolName: z.string().trim().min(2).max(60),
  /** 레거시 `department` */
  department: courseDepartmentSchema,
  /** 레거시 `grade` */
  grade: elementaryGradeSchema,
  privacyConsent: requiredConsentSchema,
  idempotencyKey: idempotencyKeySchema,
});
export type CourseApplicationInput = z.infer<typeof courseApplicationSchema>;

export const eventReservationSchema = z.object({
  eventId: cuidLikeIdSchema,
  name: personNameSchema,
  phone: phoneSchema,
  grade: elementaryGradeSchema,
  attendeeCount: z.coerce
    .number()
    .int()
    .min(1, { message: "참석 인원은 1명 이상이어야 합니다." })
    .max(EVENT_ATTENDEE_MAX, {
      message: `참석 인원은 최대 ${EVENT_ATTENDEE_MAX}명까지 신청할 수 있습니다.`,
    }),
  privacyConsent: requiredConsentSchema,
  idempotencyKey: idempotencyKeySchema,
});
export type EventReservationInput = z.infer<typeof eventReservationSchema>;

/** AD-009 사이트 내 입학진단·상담 신청 기본 계약. 레거시 공개 화면은 외부 Google Forms 링크였다. (EV-0013, ASM-082) */
export const CONSULTATION_PRIVACY_CONSENT = {
  heading: "개인정보 수집 및 이용 동의",
  purpose: "입학진단 및 상담 신청 확인·상담 진행",
  collectedItems: "학부모 성함, 연락처, 학생 학년, 상담 유형, 문의 내용",
  retention: "상담 완료 및 안내 종료 시점까지 보관 후 파기",
  checkboxLabel: "개인정보 수집 및 이용에 동의합니다. (필수)",
  submitLabel: "입학진단 및 상담 신청하기",
  policyVersion: "consultation-asm-057-v1",
} as const;

export const consultationApplicationSchema = z.object({
  guardianName: personNameSchema,
  guardianPhone: phoneSchema,
  studentGrade: elementaryGradeSchema,
  consultationTypeId: cuidLikeIdSchema,
  inquiry: z.string().trim().max(2000).optional(),
  privacyConsent: requiredConsentSchema,
  idempotencyKey: idempotencyKeySchema,
});
export type ConsultationApplicationInput = z.infer<
  typeof consultationApplicationSchema
>;

/** EV-0014에서 관찰된 강사 지원 선택값. 저장 전 서버에서 다시 검증한다. */
export const INSTRUCTOR_EXPERIENCE_OPTIONS = [
  "신입 (1년 미만)",
  "1년 이상 ~ 3년 미만",
  "3년 이상 ~ 5년 미만",
  "5년 이상 ~ 10년 미만",
  "10년 이상 베테랑",
] as const;
export const INSTRUCTOR_SPECIALTIES = [
  "인문 논술 (언어/사회)",
  "상경·수리 인문 논술",
  "자연계 수리 논술",
  "자연계 과학 논술",
  "SKY구술면접/의약학/교대구술",
  "학생부 종합 구술 면접",
] as const;
export const INSTRUCTOR_CAPABILITIES = [
  "실시간 현장 대면 첨삭",
  "정밀 서면 분석 채점",
  "비대면 영상 첨삭 시스템",
  "예시답안 직접 집필 가능",
  "자체 모의고사 출제 가능",
  "자체 기본서 커리 보유",
] as const;

/**
 * AD-011 강사 지원. 레거시 `/sub/Recruit` 공개 폼을 관찰해 그 계약을 그대로 따른다. (EV-0014)
 * 화면 안내 문구는 PDF·HWPM·DOCX였으나, 사용자 지시에 따라 HWP·HWPX를 포함한 4종으로 받는다. // ASM-085
 */
export const INSTRUCTOR_PRIVACY_CONSENT = {
  heading: "개인정보 수집 및 이용 동의",
  purpose: "강사 채용 서류 심사 및 채용 절차 진행",
  collectedItems:
    "강사명, 연락처, 이메일, 최종 학력, 경력 연수, 지원 분야, 자기소개·경력 기술, 제출 서류",
  retention: "채용 절차 종료 후 보관 기간이 지나면 제출 서류와 함께 파기",
  checkboxLabel:
    "강사 채용·서류 심사를 위한 개인정보 수집 및 이용에 동의합니다. (필수)",
  submitLabel: "문사유 아카데미 강사 지원서 제출하기",
  policyVersion: "instructor-asm-085-v1",
} as const;

/** 제출 서류 허용 형식. 확장자가 아니라 파일 내용으로 다시 확인한다. // ASM-085 */
export const RESUME_FILE_FORMATS = ["pdf", "docx", "hwp", "hwpx"] as const;
export type ResumeFileFormat = (typeof RESUME_FILE_FORMATS)[number];

export const RESUME_FORMAT_LABEL = "PDF, DOCX, HWP, HWPX";

/** 기본 상한 10MB. 관리자 설정(`recruit.resume.maxBytes`)으로 바꾼다. // ASM-085 */
export const RESUME_MAX_BYTES_DEFAULT = 10 * 1024 * 1024;
export const RESUME_MAX_BYTES_LIMIT = 50 * 1024 * 1024;

export const RESUME_CONTENT_TYPES: Record<ResumeFileFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  hwp: "application/x-hwp",
  hwpx: "application/hwp+zip",
};

/** 파일 자체는 multipart로 받으므로 계약에는 텍스트 항목만 둔다. */
export const instructorApplicationSchema = z.object({
  name: personNameSchema,
  phone: phoneSchema,
  email: z.string().trim().email().max(254),
  education: z.string().trim().min(2).max(500),
  experienceYears: z.enum(INSTRUCTOR_EXPERIENCE_OPTIONS),
  specialties: z
    .array(z.enum(INSTRUCTOR_SPECIALTIES))
    .min(1)
    .max(INSTRUCTOR_SPECIALTIES.length),
  capabilities: z
    .array(z.enum(INSTRUCTOR_CAPABILITIES))
    .min(1)
    .max(INSTRUCTOR_CAPABILITIES.length),
  headline: z.string().trim().min(2).max(300),
  careerDetail: z.string().trim().min(2).max(5000),
  coachingDetail: z.string().trim().min(2).max(5000),
  privacyConsent: requiredConsentSchema,
  idempotencyKey: idempotencyKeySchema,
});
export type InstructorApplicationInput = z.infer<typeof instructorApplicationSchema>;

/**
 * AD-010 설명회 알림 신청. 레거시 메인 하단 폼(`POST ./sms_subscribe.ajax.php`, EV-0003)의
 * 입력 항목을 그대로 받되, 레거시에 없던 개인정보·알림 수신 동의를 새로 둔다. // ASM-086
 * 문자 발송은 하지 않는다. (D4)
 */
export const SMS_SUBSCRIPTION_CONSENT = {
  heading: "개인정보 수집 및 이용 동의",
  purpose: "설명회 일정 안내 연락",
  collectedItems: "학년, 학생 이름, 학교명, 보호자 연락처",
  retention: "설명회 안내 종료 시점까지 보관 후 파기",
  checkboxLabel: "개인정보 수집 및 이용에 동의합니다. (필수)",
  notifyCheckboxLabel: "설명회 일정 안내 연락을 받는 데 동의합니다. (필수)",
  submitLabel: "설명회 알림 신청하기",
  policyVersion: "sms-asm-086-v1",
} as const;

export const smsSubscriptionSchema = z.object({
  grade: elementaryGradeSchema,
  studentName: personNameSchema,
  schoolName: z.string().trim().min(2).max(60),
  guardianPhone: phoneSchema,
  privacyConsent: requiredConsentSchema,
  notifyConsent: requiredConsentSchema,
  idempotencyKey: idempotencyKeySchema,
});
export type SmsSubscriptionInput = z.infer<typeof smsSubscriptionSchema>;

/** 신청·예약 생성 응답. 저장된 개인정보를 그대로 돌려주지 않는다. */
export type ApplicationCreatedResult = {
  id: string;
  /** 같은 idempotency key 재전송이면 true. 새로 저장하지 않았다는 뜻이다. */
  replayed: boolean;
  createdAt: string;
};

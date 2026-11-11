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
  policyVersion: COURSE_PRIVACY_CONSENT.policyVersion,
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

/** 신청·예약 생성 응답. 저장된 개인정보를 그대로 돌려주지 않는다. */
export type ApplicationCreatedResult = {
  id: string;
  /** 같은 idempotency key 재전송이면 true. 새로 저장하지 않았다는 뜻이다. */
  replayed: boolean;
  createdAt: string;
};

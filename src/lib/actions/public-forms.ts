"use server";

import type { ActionResult } from "@/lib/action-result";
import {
  courseApplicationSchema,
  eventReservationSchema,
  instructorApplicationSchema,
  reservationCancelSchema,
  reservationLookupSchema,
  smsSubscriptionSchema,
  type ReservationSummary,
} from "@/lib/contracts";
import {
  enforcePublicRateLimit,
  failure,
  formEntries,
  isNonEmptyString,
  parseInput,
  readUploadedFile,
  success,
  toFailure,
} from "@/lib/actions/internal";
import { createCourseApplication } from "@/server/services/course-applications";
import { createEventReservation } from "@/server/services/event-reservations";
import { createInstructorApplication } from "@/server/services/instructor-applications";
import { cancelReservation, lookupReservations } from "@/server/services/reservations";
import { createSmsSubscription } from "@/server/services/sms-subscriptions";

/**
 * 공개 화면의 신청·예약·조회 Server Action.
 *
 * - 사이트 자체 폼은 Server Action 으로 처리하고, `app/api/**` Route Handler 는
 *   외부·프로그램 호출용 공개 API 로 그대로 남긴다. (BLUEPRINT 2장, MIGRATION_PLAN 5장)
 * - 클라이언트가 이미 같은 Zod 스키마로 검증했더라도 서버에서 **다시** 검증한다.
 * - 응답에는 저장한 개인정보를 그대로 담지 않는다. (BLUEPRINT 10장)
 */

/** FM-001 강좌 수강 신청. */
export async function submitCourseApplicationAction(
  input: unknown,
): Promise<ActionResult<{ id: string; replayed: boolean }>> {
  try {
    await enforcePublicRateLimit("action-course-application");
    const parsed = parseInput(courseApplicationSchema, input);
    if (!parsed.ok) return parsed.failure;

    const created = await createCourseApplication(parsed.value);
    return success({ id: created.id, replayed: created.replayed });
  } catch (error) {
    return toFailure(error);
  }
}

/** FM-002 설명회 예약. */
export async function submitEventReservationAction(
  input: unknown,
): Promise<ActionResult<{ id: string; replayed: boolean }>> {
  try {
    await enforcePublicRateLimit("action-event-reservation");
    const parsed = parseInput(eventReservationSchema, input);
    if (!parsed.ok) return parsed.failure;

    const created = await createEventReservation(parsed.value);
    return success({ id: created.id, replayed: created.replayed });
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * PG-011 예약 조회. 강좌 신청과 설명회 예약을 함께 돌려준다. (ASM-013)
 * 조회 결과가 없어도 실패로 보지 않는다. 존재 여부를 알려 주지 않기 위해서다.
 */
export async function lookupReservationsAction(
  input: unknown,
): Promise<ActionResult<{ items: ReservationSummary[] }>> {
  try {
    await enforcePublicRateLimit("action-reservation-lookup");
    const parsed = parseInput(reservationLookupSchema, input);
    if (!parsed.ok) return parsed.failure;

    const result = await lookupReservations(parsed.value);
    return success({ items: result.items });
  } catch (error) {
    return toFailure(error);
  }
}

/** PG-011 예약 건별 취소. 본인 확인 정보가 맞지 않으면 404 로 돌아온다. */
export async function cancelReservationAction(
  input: unknown,
): Promise<ActionResult<{ reservationId: string }>> {
  try {
    await enforcePublicRateLimit("action-reservation-cancel");
    const parsed = parseInput(reservationCancelSchema, input);
    if (!parsed.ok) return parsed.failure;

    const result = await cancelReservation(parsed.value);
    return success({ reservationId: result.reservationId });
  } catch (error) {
    return toFailure(error);
  }
}

/** AD-010 설명회 알림 신청. 문자 발송은 하지 않고 신청 내역만 남긴다. // ASM-086 */
export async function submitSmsSubscriptionAction(
  input: unknown,
): Promise<ActionResult<{ id: string; replayed: boolean }>> {
  try {
    await enforcePublicRateLimit("action-sms-subscription");
    const parsed = parseInput(smsSubscriptionSchema, input);
    if (!parsed.ok) return parsed.failure;

    const created = await createSmsSubscription(parsed.value);
    return success({ id: created.id, replayed: created.replayed });
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * AD-011 강사 지원. 제출 서류가 있어 `FormData` 를 그대로 받는다.
 * 파일 내용 검사·용량 확인·저장은 모두 서비스 계층에서 한다. (EV-0014)
 */
export async function submitInstructorApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; replayed: boolean }>> {
  try {
    await enforcePublicRateLimit("action-instructor-application");

    const raw = formEntries(formData);
    const parsed = parseInput(instructorApplicationSchema, {
      ...raw,
      specialties: formData.getAll("specialties").filter(isNonEmptyString),
      capabilities: formData.getAll("capabilities").filter(isNonEmptyString),
      privacyConsent: raw.privacyConsent === "on" || raw.privacyConsent === "true",
    });
    if (!parsed.ok) return parsed.failure;

    const resume = await readUploadedFile(formData.get("resume"));
    if (!resume) {
      return failure("입력값을 다시 확인해 주세요.", {
        resume: ["이력서 및 자기소개서 파일을 올려 주세요."],
      });
    }
    const portfolio = await readUploadedFile(formData.get("portfolio"));

    const created = await createInstructorApplication(parsed.value, {
      resume,
      portfolio,
    });
    return success({ id: created.id, replayed: created.replayed });
  } catch (error) {
    return toFailure(error);
  }
}

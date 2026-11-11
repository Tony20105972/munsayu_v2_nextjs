"use server";

import type { ActionResult } from "@/lib/action-result";
import {
  courseApplicationSchema,
  eventReservationSchema,
  reservationCancelSchema,
  reservationLookupSchema,
  type ReservationSummary,
} from "@/lib/contracts";
import {
  enforcePublicRateLimit,
  parseInput,
  success,
  toFailure,
} from "@/lib/actions/internal";
import { createCourseApplication } from "@/server/services/course-applications";
import { createEventReservation } from "@/server/services/event-reservations";
import { cancelReservation, lookupReservations } from "@/server/services/reservations";

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

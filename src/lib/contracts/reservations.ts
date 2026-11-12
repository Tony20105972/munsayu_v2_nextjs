import { z } from "zod";
import { cuidLikeIdSchema, personNameSchema, phoneSchema } from "./common";

/**
 * PG-011 예약 조회·취소 계약.
 * 같은 연락처로 여러 건을 신청할 수 있으므로 조회는 목록을 돌려주고 취소는 건별로 한다. (ASM-001)
 * 조회 범위는 강좌 신청과 설명회 예약을 함께 본다. (ASM-013)
 */

export const RESERVATION_KINDS = ["course", "event"] as const;
export const reservationKindSchema = z.enum(RESERVATION_KINDS);
export type ReservationKind = (typeof RESERVATION_KINDS)[number];

/** 레거시 조회 화면은 학생 이름과 보호자 휴대폰을 받는다. (EV-0008) */
export const reservationLookupSchema = z.object({
  name: personNameSchema,
  phone: phoneSchema,
});
export type ReservationLookupInput = z.infer<typeof reservationLookupSchema>;

/** 취소는 조회와 같은 본인 확인 정보에 대상 건 식별자를 더한다. */
export const reservationCancelSchema = reservationLookupSchema.extend({
  kind: reservationKindSchema,
  reservationId: cuidLikeIdSchema,
});
export type ReservationCancelInput = z.infer<typeof reservationCancelSchema>;

export const RESERVATION_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** 조회 결과 1건. 조회한 본인에게 보여 주는 값이라 이름만 마스킹하지 않고 그대로 쓴다. */
export type ReservationSummary = {
  kind: ReservationKind;
  reservationId: string;
  status: ReservationStatus;
  /** 강좌명 또는 설명회 제목 */
  title: string;
  /** 지점 이름. 설명회에 지점이 없으면 null */
  campusName: string | null;
  /** 강좌는 개강일, 설명회는 시작 시각 */
  scheduledAt: string | null;
  scheduleText: string | null;
  attendeeCount: number | null;
  appliedAt: string;
  cancellable: boolean;
};

export type ReservationLookupResult = {
  items: ReservationSummary[];
};

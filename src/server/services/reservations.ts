import "@/server/server-only";
import type {
  ReservationCancelInput,
  ReservationLookupInput,
  ReservationLookupResult,
  ReservationSummary,
} from "@/lib/contracts";
import { db } from "@/server/db";
import { notFound } from "@/server/errors";

/**
 * PG-011 예약 조회·취소.
 *
 * 같은 연락처로 여러 건을 신청할 수 있으므로 조회는 강좌 신청과 설명회 예약을
 * 함께 목록으로 돌려준다. (ASM-001, ASM-013)
 * 본인 확인 정보가 맞지 않으면 존재 여부를 알려 주지 않고 모두 404로 답한다.
 */
export async function lookupReservations(
  input: ReservationLookupInput,
): Promise<ReservationLookupResult> {
  const [courseApplications, eventReservations] = await Promise.all([
    db.courseApplication.findMany({
      where: {
        studentName: input.name,
        guardianPhone: input.phone,
        purgedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          select: {
            title: true,
            scheduleText: true,
            startDate: true,
            campus: { select: { name: true } },
          },
        },
      },
    }),
    db.eventReservation.findMany({
      where: { name: input.name, phone: input.phone, purgedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            title: true,
            startsAt: true,
            venue: true,
            campus: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const items: ReservationSummary[] = [
    ...courseApplications.map((application) => ({
      kind: "course" as const,
      reservationId: application.id,
      status: application.status,
      title: application.course.title,
      campusName: application.course.campus.name,
      scheduledAt: application.course.startDate?.toISOString() ?? null,
      scheduleText: application.course.scheduleText,
      attendeeCount: null,
      appliedAt: application.createdAt.toISOString(),
      cancellable: application.status !== "CANCELLED",
    })),
    ...eventReservations.map((reservation) => ({
      kind: "event" as const,
      reservationId: reservation.id,
      status: reservation.status,
      title: reservation.event.title,
      campusName: reservation.event.campus?.name ?? null,
      scheduledAt: reservation.event.startsAt.toISOString(),
      scheduleText: reservation.event.venue,
      attendeeCount: reservation.attendeeCount,
      appliedAt: reservation.createdAt.toISOString(),
      cancellable: reservation.status !== "CANCELLED",
    })),
  ].sort((left, right) => right.appliedAt.localeCompare(left.appliedAt));

  return { items };
}

export type ReservationCancelResult = {
  kind: ReservationCancelInput["kind"];
  reservationId: string;
  status: "CANCELLED";
};

/** 취소는 건별로 하고 기록을 지우지 않는다. 상태만 CANCELLED로 바꾼다. (BLUEPRINT 6장) */
export async function cancelReservation(
  input: ReservationCancelInput,
): Promise<ReservationCancelResult> {
  const cancelledAt = new Date();

  if (input.kind === "course") {
    const result = await db.courseApplication.updateMany({
      where: {
        id: input.reservationId,
        studentName: input.name,
        guardianPhone: input.phone,
        purgedAt: null,
      },
      data: { status: "CANCELLED", cancelledAt },
    });
    if (result.count === 0) throw notFound();
  } else {
    const result = await db.eventReservation.updateMany({
      where: {
        id: input.reservationId,
        name: input.name,
        phone: input.phone,
        purgedAt: null,
      },
      data: { status: "CANCELLED", cancelledAt },
    });
    if (result.count === 0) throw notFound();
  }

  return { kind: input.kind, reservationId: input.reservationId, status: "CANCELLED" };
}

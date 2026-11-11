import "server-only";
import { db } from "@/server/db";
import type { CourseApplicationInput, EventReservationInput } from "@/lib/contracts";

export class ClosedIntakeError extends Error {}

export async function createCourseApplication(input: CourseApplicationInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.$transaction(async (tx: any) => {
    const existing = await tx.courseApplication.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return { record: existing, replayed: true };
    const course = await tx.course.findUnique({ where: { id: input.courseId }, select: { intakeStatus: true } });
    if (!course || course.intakeStatus !== "OPEN") throw new ClosedIntakeError();
    const record = await tx.courseApplication.create({ data: { ...input, privacyConsentAt: new Date() } });
    return { record, replayed: false };
  });
}

export async function createEventReservation(input: EventReservationInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.$transaction(async (tx: any) => {
    const existing = await tx.eventReservation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return { record: existing, replayed: true };
    // D9: status is manually controlled; capacity and same-phone submissions never block intake.
    const event = await tx.event.findUnique({ where: { id: input.eventId }, include: { statusOption: true } });
    if (!event || event.statusOption.isClosed) throw new ClosedIntakeError();
    const record = await tx.eventReservation.create({ data: { ...input, privacyConsentAt: new Date() } });
    return { record, replayed: false };
  });
}

export async function setCourseIntakeStatus(courseId: string, isOpen: boolean) {
  return db.course.update({ where: { id: courseId }, data: { intakeStatus: isOpen ? "OPEN" : "CLOSED" } });
}

export async function setEventStatus(eventId: string, statusOptionId: string) {
  return db.event.update({ where: { id: eventId }, data: { statusOptionId } });
}

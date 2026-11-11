import "@/server/server-only";
import type { Event, EventStatusOption } from "@prisma/client";
import type {
  EventStatusChangeInput,
  EventStatusOptionInput,
  EventUpsertInput,
} from "@/lib/contracts";
import { db } from "@/server/db";
import { conflict, notFound, validationFailed } from "@/server/errors";

export type PublicEvent = {
  id: string;
  campusId: string | null;
  campusName: string | null;
  managementCode: string;
  title: string;
  startsAt: string;
  venue: string | null;
  speaker: string | null;
  statusLabel: string;
  isClosed: boolean;
};

/** PG-010 공개 설명회 목록. 상태 문구는 관리자가 고른 값을 그대로 보여 준다. (ASM-001) */
export async function listPublicEvents(options: {
  campusId?: string;
}): Promise<PublicEvent[]> {
  const events = await db.event.findMany({
    where: options.campusId ? { campusId: options.campusId } : {},
    orderBy: [{ startsAt: "asc" }],
    include: {
      campus: { select: { name: true } },
      statusOption: { select: { label: true, isClosed: true } },
    },
  });

  return events.map((event) => ({
    id: event.id,
    campusId: event.campusId,
    campusName: event.campus?.name ?? null,
    managementCode: event.managementCode,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    venue: event.venue,
    speaker: event.speaker,
    statusLabel: event.statusOption.label,
    isClosed: event.statusOption.isClosed,
  }));
}

export async function listEventStatusOptions(): Promise<EventStatusOption[]> {
  return db.eventStatusOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
}

export async function createEventStatusOption(
  input: EventStatusOptionInput,
): Promise<EventStatusOption> {
  const existing = await db.eventStatusOption.findUnique({
    where: { label: input.label },
    select: { id: true },
  });
  if (existing) throw conflict("같은 이름의 상태가 이미 있습니다.");

  return db.eventStatusOption.create({
    data: { label: input.label, sortOrder: input.sortOrder, isClosed: input.isClosed },
  });
}

async function assertStatusOptionExists(statusOptionId: string): Promise<void> {
  const option = await db.eventStatusOption.findUnique({
    where: { id: statusOptionId },
    select: { id: true },
  });
  if (!option) {
    throw validationFailed({ statusOptionId: ["상태를 찾을 수 없습니다."] });
  }
}

async function assertCampusExistsIfGiven(campusId: string | null): Promise<void> {
  if (!campusId) return;
  const campus = await db.campus.findUnique({
    where: { id: campusId },
    select: { id: true },
  });
  if (!campus) {
    throw validationFailed({ campusId: ["지점을 찾을 수 없습니다."] });
  }
}

export async function createEvent(input: EventUpsertInput): Promise<Event> {
  await assertStatusOptionExists(input.statusOptionId);
  await assertCampusExistsIfGiven(input.campusId);

  const duplicate = await db.event.findUnique({
    where: { managementCode: input.managementCode },
    select: { id: true },
  });
  if (duplicate) throw conflict("같은 관리코드의 설명회가 이미 있습니다.");

  return db.event.create({
    data: {
      campusId: input.campusId,
      managementCode: input.managementCode,
      title: input.title,
      startsAt: input.startsAt,
      venue: input.venue,
      speaker: input.speaker,
      statusOptionId: input.statusOptionId,
    },
  });
}

export async function updateEvent(
  eventId: string,
  input: EventUpsertInput,
): Promise<Event> {
  const existing = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!existing) throw notFound();
  await assertStatusOptionExists(input.statusOptionId);
  await assertCampusExistsIfGiven(input.campusId);

  const duplicate = await db.event.findFirst({
    where: { managementCode: input.managementCode, id: { not: eventId } },
    select: { id: true },
  });
  if (duplicate) throw conflict("같은 관리코드의 설명회가 이미 있습니다.");

  return db.event.update({
    where: { id: eventId },
    data: {
      campusId: input.campusId,
      managementCode: input.managementCode,
      title: input.title,
      startsAt: input.startsAt,
      venue: input.venue,
      speaker: input.speaker,
      statusOptionId: input.statusOptionId,
    },
  });
}

/** 예약 기록이 있는 설명회는 지우지 않는다. */
export async function deleteEvent(eventId: string): Promise<void> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { _count: { select: { reservations: true } } },
  });
  if (!event) throw notFound();
  if (event._count.reservations > 0) {
    throw conflict(
      "예약 기록이 있는 설명회는 삭제할 수 없습니다. 접수마감으로 바꿔 주세요.",
    );
  }
  await db.event.delete({ where: { id: eventId } });
}

/** AD-004 상태 변경은 관리자 수동 전환만 있다. 정원·인원에 따른 자동 전환은 없다. (ASM-001) */
export async function changeEventStatus(input: EventStatusChangeInput): Promise<Event> {
  const existing = await db.event.findUnique({
    where: { id: input.eventId },
    select: { id: true },
  });
  if (!existing) throw notFound();
  await assertStatusOptionExists(input.statusOptionId);

  return db.event.update({
    where: { id: input.eventId },
    data: { statusOptionId: input.statusOptionId },
  });
}

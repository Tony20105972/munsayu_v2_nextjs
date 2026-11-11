import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { POST as createEventReservation } from "../../app/api/event-reservations/route";
import { GET as eventsGet, POST as eventsPost } from "../../app/api/admin/events/route";
import {
  PUT as eventPut,
  DELETE as eventDelete,
} from "../../app/api/admin/events/[id]/route";
import { GET as eventTotals } from "../../app/api/admin/events/[id]/totals/route";
import { POST as eventStatusRoute } from "../../app/api/admin/events/status/route";
import {
  GET as statusOptionsGet,
  POST as statusOptionsPost,
} from "../../app/api/admin/event-status-options/route";
import { GET as applicationsGet } from "../../app/api/admin/applications/route";
import {
  adminCookie,
  eventReservationBody,
  makeRequest,
  resetDatabase,
  routeContext,
  seedContent,
  type SeededContent,
} from "./helpers";

let cookie: string;
let content: SeededContent;

beforeEach(async () => {
  await resetDatabase();
  content = await seedContent();
  cookie = await adminCookie();
});

describe("AD-003~005 설명회 관리", () => {
  test("AD-003 설명회 추가·수정·삭제가 된다", async () => {
    const created = await eventsPost(
      makeRequest("POST", "/api/admin/events", {
        cookie,
        body: {
          campusId: content.campusId,
          managementCode: "2027NEW",
          title: "신규 설명회",
          startsAt: "2027-04-01T02:00:00.000Z",
          venue: "대치본원 3층",
          speaker: "가상 강사",
          statusOptionId: content.openStatusOptionId,
        },
      }),
    );
    expect(created.status).toBe(201);
    const { id } = await created.json();

    const updated = await eventPut(
      makeRequest("PUT", `/api/admin/events/${id}`, {
        cookie,
        body: {
          campusId: content.campusId,
          managementCode: "2027FIX",
          title: "수정된 설명회",
          startsAt: "2027-04-02T02:00:00.000Z",
          venue: null,
          speaker: null,
          statusOptionId: content.closedStatusOptionId,
        },
      }),
      routeContext({ id }),
    );
    expect(updated.status).toBe(200);
    expect((await updated.json()).managementCode).toBe("2027FIX");

    const deleted = await eventDelete(
      makeRequest("DELETE", `/api/admin/events/${id}`, { cookie }),
      routeContext({ id }),
    );
    expect(deleted.status).toBe(200);
    expect(await db.event.findUnique({ where: { id } })).toBeNull();
  });

  test("AD-003 설명회 추가: 관리코드가 겹치면 409", async () => {
    const response = await eventsPost(
      makeRequest("POST", "/api/admin/events", {
        cookie,
        body: {
          campusId: content.campusId,
          managementCode: "2027D1",
          title: "중복 코드 설명회",
          startsAt: "2027-04-01T02:00:00.000Z",
          statusOptionId: content.openStatusOptionId,
        },
      }),
    );
    expect(response.status).toBe(409);
  });

  test("AD-003 설명회 삭제: 예약 기록이 있으면 409로 막는다", async () => {
    await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId),
      }),
    );

    const response = await eventDelete(
      makeRequest("DELETE", `/api/admin/events/${content.openEventId}`, { cookie }),
      routeContext({ id: content.openEventId }),
    );
    expect(response.status).toBe(409);
    expect(
      await db.event.findUnique({ where: { id: content.openEventId } }),
    ).not.toBeNull();
  });

  test("AD-003 설명회 목록을 관리자 권한으로 조회한다", async () => {
    const response = await eventsGet(
      makeRequest("GET", "/api/admin/events", { cookie }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(2);
  });

  test("AD-004 상태 목록 조회·추가와 수동 상태 변경이 된다", async () => {
    const list = await statusOptionsGet(
      makeRequest("GET", "/api/admin/event-status-options", { cookie }),
    );
    expect((await list.json()).items).toHaveLength(2);

    const created = await statusOptionsPost(
      makeRequest("POST", "/api/admin/event-status-options", {
        cookie,
        body: { label: "마감임박", sortOrder: 2, isClosed: false },
      }),
    );
    expect(created.status).toBe(201);
    const { id: soonId } = await created.json();

    const duplicate = await statusOptionsPost(
      makeRequest("POST", "/api/admin/event-status-options", {
        cookie,
        body: { label: "마감임박", sortOrder: 2, isClosed: false },
      }),
    );
    expect(duplicate.status).toBe(409);

    const changed = await eventStatusRoute(
      makeRequest("POST", "/api/admin/events/status", {
        cookie,
        body: { eventId: content.openEventId, statusOptionId: soonId },
      }),
    );
    expect(changed.status).toBe(200);

    const event = await db.event.findUniqueOrThrow({
      where: { id: content.openEventId },
    });
    expect(event.statusOptionId).toBe(soonId);
  });

  test("AD-004 상태 변경: 없는 상태를 지정하면 422", async () => {
    const response = await eventStatusRoute(
      makeRequest("POST", "/api/admin/events/status", {
        cookie,
        body: { eventId: content.openEventId, statusOptionId: "missing-id" },
      }),
    );
    expect(response.status).toBe(422);
  });

  test("AD-005 설명회 집계: 예약 건수와 참석 인원 합계를 따로 센다", async () => {
    await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId, { attendeeCount: 2 }),
      }),
    );
    await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId, { attendeeCount: 1 }),
      }),
    );
    const cancelled = await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId, { attendeeCount: 2 }),
      }),
    );
    await db.eventReservation.update({
      where: { id: (await cancelled.json()).id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    const response = await eventTotals(
      makeRequest("GET", `/api/admin/events/${content.openEventId}/totals`, { cookie }),
      routeContext({ id: content.openEventId }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.reservationCount).toBe(2);
    expect(body.attendeeTotal).toBe(3);
  });

  test("AD-005 설명회 예약 목록은 마스킹된 값만 내려온다", async () => {
    await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId, {
          name: "김학부모",
          phone: "010-2222-3333",
        }),
      }),
    );

    const response = await applicationsGet(
      makeRequest("GET", "/api/admin/applications?kind=event", { cookie }),
    );
    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].maskedName).toBe("김**모");
    expect(body.items[0].maskedPhone).toBe("010-****-3333");
    expect(body.items[0].attendeeCount).toBe(2);
    expect(JSON.stringify(body)).not.toContain("김학부모");
    expect(JSON.stringify(body)).not.toContain("010-2222-3333");
  });
});

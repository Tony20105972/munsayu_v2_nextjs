import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { POST as createCourseApplication } from "../../app/api/course-applications/route";
import { POST as createEventReservation } from "../../app/api/event-reservations/route";
import { POST as lookupRoute } from "../../app/api/reservations/lookup/route";
import { POST as cancelRoute } from "../../app/api/reservations/[id]/cancel/route";
import {
  courseApplicationBody,
  eventReservationBody,
  makeRequest,
  resetDatabase,
  routeContext,
  seedContent,
  type SeededContent,
} from "./helpers";

const NAME = "홍길동";
const PHONE = "010-1234-5678";

let content: SeededContent;

async function lookup(name: string, phone: string): Promise<Response> {
  return lookupRoute(
    makeRequest("POST", "/api/reservations/lookup", { body: { name, phone } }),
  );
}

async function cancel(
  reservationId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return cancelRoute(
    makeRequest("POST", `/api/reservations/${reservationId}/cancel`, { body }),
    routeContext({ id: reservationId }),
  );
}

beforeEach(async () => {
  await resetDatabase();
  content = await seedContent();
});

describe("PG-011 예약 조회·취소", () => {
  test("PG-011 예약 조회: 같은 연락처의 강좌 신청과 설명회 예약을 함께 돌려준다", async () => {
    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId, { name: NAME, phone: PHONE }),
      }),
    );

    const response = await lookup(NAME, PHONE);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body.items).toHaveLength(3);
    expect(
      body.items.filter((item: { kind: string }) => item.kind === "course"),
    ).toHaveLength(2);
    expect(
      body.items.filter((item: { kind: string }) => item.kind === "event"),
    ).toHaveLength(1);
    expect(body.items.every((item: { cancellable: boolean }) => item.cancellable)).toBe(
      true,
    );
  });

  test("PG-011 예약 조회: 일치하는 건이 없으면 빈 목록을 돌려준다", async () => {
    const response = await lookup("없는사람", "010-9999-8888");
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(0);
  });

  test("PG-011 예약 조회: 하이픈 없이 입력해도 같은 결과를 돌려준다", async () => {
    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );

    const response = await lookup(NAME, "01012345678");
    expect((await response.json()).items).toHaveLength(1);
  });

  test("PG-011 예약 취소: 건별로 취소하면 상태만 CANCELLED가 된다", async () => {
    const created = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const { id } = await created.json();

    const response = await cancel(id, {
      name: NAME,
      phone: PHONE,
      kind: "course",
      reservationId: id,
    });
    expect(response.status).toBe(200);

    const saved = await db.courseApplication.findUniqueOrThrow({ where: { id } });
    expect(saved.status).toBe("CANCELLED");
    expect(saved.cancelledAt).toBeInstanceOf(Date);
    expect(await db.courseApplication.count()).toBe(1);
  });

  test("PG-011 예약 취소: 여러 건 중 하나만 취소된다", async () => {
    const first = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const { id } = await first.json();

    await cancel(id, { name: NAME, phone: PHONE, kind: "course", reservationId: id });

    expect(await db.courseApplication.count({ where: { status: "CANCELLED" } })).toBe(
      1,
    );
    expect(await db.courseApplication.count({ where: { status: "PENDING" } })).toBe(1);
  });

  test("PG-011 예약 취소: 이름·연락처가 다르면 404", async () => {
    const created = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const { id } = await created.json();

    const wrongName = await cancel(id, {
      name: "다른이름",
      phone: PHONE,
      kind: "course",
      reservationId: id,
    });
    expect(wrongName.status).toBe(404);
    expect((await wrongName.json()).code).toBe("NOT_FOUND");

    const wrongPhone = await cancel(id, {
      name: NAME,
      phone: "010-0000-9999",
      kind: "course",
      reservationId: id,
    });
    expect(wrongPhone.status).toBe(404);

    const saved = await db.courseApplication.findUniqueOrThrow({ where: { id } });
    expect(saved.status).toBe("PENDING");
  });

  test("PG-011 예약 취소: 타인 건을 취소하려 해도 존재를 알리지 않고 404", async () => {
    const mine = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const other = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId, {
          studentName: "다른학생",
          guardianPhone: "010-5555-6666",
        }),
      }),
    );
    const otherId = (await other.json()).id;
    expect((await mine.json()).id).not.toBe(otherId);

    const response = await cancel(otherId, {
      name: NAME,
      phone: PHONE,
      kind: "course",
      reservationId: otherId,
    });
    expect(response.status).toBe(404);

    const saved = await db.courseApplication.findUniqueOrThrow({
      where: { id: otherId },
    });
    expect(saved.status).toBe("PENDING");
  });

  test("PG-011 예약 취소: 경로 id와 본문 reservationId가 다르면 404", async () => {
    const created = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const { id } = await created.json();

    const response = await cancel("another-id", {
      name: NAME,
      phone: PHONE,
      kind: "course",
      reservationId: id,
    });
    expect(response.status).toBe(404);
  });

  test("PG-011 예약 취소: 설명회 예약도 건별로 취소된다", async () => {
    const created = await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId, { name: NAME, phone: PHONE }),
      }),
    );
    const { id } = await created.json();

    const response = await cancel(id, {
      name: NAME,
      phone: PHONE,
      kind: "event",
      reservationId: id,
    });
    expect(response.status).toBe(200);

    const saved = await db.eventReservation.findUniqueOrThrow({ where: { id } });
    expect(saved.status).toBe("CANCELLED");
  });
});

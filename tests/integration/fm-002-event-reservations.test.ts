import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { getMemoryNotifyAdapter } from "@/server/adapters/notify";
import { POST as createEventReservation } from "../../app/api/event-reservations/route";
import {
  eventReservationBody,
  makeRequest,
  newIdempotencyKey,
  resetDatabase,
  seedContent,
  type SeededContent,
} from "./helpers";

let content: SeededContent;

async function post(body: Record<string, unknown>): Promise<Response> {
  return createEventReservation(
    makeRequest("POST", "/api/event-reservations", { body }),
  );
}

beforeEach(async () => {
  await resetDatabase();
  content = await seedContent();
});

describe("FM-002 설명회 예약", () => {
  test("FM-002 설명회 예약: 정상 입력이면 201로 저장된다", async () => {
    const response = await post(eventReservationBody(content.openEventId));
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const saved = await db.eventReservation.findUniqueOrThrow({
      where: { id: (await response.json()).id },
    });
    expect(saved.attendeeCount).toBe(2);
    expect(saved.status).toBe("PENDING");
    expect(saved.retentionPolicyVersion).toBe("legacy-ev-0006-v1");
  });

  test("FM-002 설명회 예약: 참석 인원 1명은 허용한다", async () => {
    const response = await post(
      eventReservationBody(content.openEventId, { attendeeCount: 1 }),
    );
    expect(response.status).toBe(201);
  });

  test("FM-002 설명회 예약: 참석 인원 3명은 422로 거부한다", async () => {
    const response = await post(
      eventReservationBody(content.openEventId, { attendeeCount: 3 }),
    );
    expect(response.status).toBe(422);
    expect(Object.keys((await response.json()).fieldErrors)).toContain("attendeeCount");
    expect(await db.eventReservation.count()).toBe(0);
  });

  test("FM-002 설명회 예약: 필수값 누락 시 422", async () => {
    const body = eventReservationBody(content.openEventId);
    delete body.grade;

    const response = await post(body);
    expect(response.status).toBe(422);
    expect(Object.keys((await response.json()).fieldErrors)).toContain("grade");
  });

  test("FM-002 설명회 예약: 동의하지 않으면 422", async () => {
    const response = await post(
      eventReservationBody(content.openEventId, { privacyConsent: false }),
    );
    expect(response.status).toBe(422);
    expect(Object.keys((await response.json()).fieldErrors)).toContain(
      "privacyConsent",
    );
  });

  test("FM-002 설명회 예약: 마감 상태면 409 INTAKE_CLOSED", async () => {
    const response = await post(eventReservationBody(content.closedEventId));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("INTAKE_CLOSED");
    expect(await db.eventReservation.count()).toBe(0);
  });

  test("FM-002 설명회 예약: 같은 연락처로 다시 신청하면 두 건 모두 저장된다", async () => {
    await post(eventReservationBody(content.openEventId));
    await post(eventReservationBody(content.openEventId));

    expect(await db.eventReservation.count({ where: { phone: "010-2222-3333" } })).toBe(
      2,
    );
  });

  test("FM-002 설명회 예약: 같은 idempotencyKey 재전송은 1건만 저장하고 replayed=true", async () => {
    const idempotencyKey = newIdempotencyKey("event-replay");
    const body = eventReservationBody(content.openEventId, { idempotencyKey });

    const first = await post(body);
    const second = await post(body);
    const firstPayload = await first.json();
    const secondPayload = await second.json();

    expect(firstPayload.replayed).toBe(false);
    expect(secondPayload.replayed).toBe(true);
    expect(secondPayload.id).toBe(firstPayload.id);
    expect(await db.eventReservation.count()).toBe(1);
  });

  test("FM-002 설명회 예약: 알림 발송이 실패해도 예약은 저장된다", async () => {
    getMemoryNotifyAdapter().failOnce();

    const response = await post(eventReservationBody(content.openEventId));
    expect(response.status).toBe(201);
    expect(await db.eventReservation.count()).toBe(1);
    expect(getMemoryNotifyAdapter().sent()).toHaveLength(0);
  });
});

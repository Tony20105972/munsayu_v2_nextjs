import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { POST as createCourseApplication } from "../../app/api/course-applications/route";
import { POST as createEventReservation } from "../../app/api/event-reservations/route";
import { POST as courseIntakeRoute } from "../../app/api/admin/courses/intake/route";
import { POST as eventStatusRoute } from "../../app/api/admin/events/status/route";
import { PUT as retentionPut } from "../../app/api/admin/privacy/retention/route";
import { POST as purgeRoute } from "../../app/api/admin/privacy/purge/route";
import { GET as privacyNotice } from "../../app/api/privacy-notice/route";
import { GET as publicEvents } from "../../app/api/events/route";
import {
  adminCookie,
  courseApplicationBody,
  eventReservationBody,
  makeRequest,
  resetDatabase,
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

describe("BZ-001 수동 마감 규칙", () => {
  test("BZ-001 강좌 수동 마감: 마감으로 바꾸면 새 신청이 409로 막힌다", async () => {
    const before = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    expect(before.status).toBe(201);

    const changed = await courseIntakeRoute(
      makeRequest("POST", "/api/admin/courses/intake", {
        cookie,
        body: { courseId: content.openCourseId, intakeOpen: false },
      }),
    );
    expect(changed.status).toBe(200);
    expect((await changed.json()).intakeOpen).toBe(false);

    const after = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    expect(after.status).toBe(409);
    expect((await after.json()).code).toBe("INTAKE_CLOSED");
    expect(await db.courseApplication.count()).toBe(1);
  });

  test("BZ-001 강좌 수동 재개: 다시 접수중으로 바꾸면 신청이 된다", async () => {
    await courseIntakeRoute(
      makeRequest("POST", "/api/admin/courses/intake", {
        cookie,
        body: { courseId: content.closedCourseId, intakeOpen: true },
      }),
    );

    const response = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.closedCourseId),
      }),
    );
    expect(response.status).toBe(201);
  });

  test("BZ-001 설명회 수동 마감: 마감 상태로 바꾸면 새 예약이 409로 막힌다", async () => {
    const before = await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId),
      }),
    );
    expect(before.status).toBe(201);

    await eventStatusRoute(
      makeRequest("POST", "/api/admin/events/status", {
        cookie,
        body: {
          eventId: content.openEventId,
          statusOptionId: content.closedStatusOptionId,
        },
      }),
    );

    const after = await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId),
      }),
    );
    expect(after.status).toBe(409);
    expect(await db.eventReservation.count()).toBe(1);
  });

  test("AD-004 설명회 상태 수동 전환은 양방향이다: 접수마감 뒤 다시 접수중이면 예약이 된다", async () => {
    const closeResponse = await eventStatusRoute(
      makeRequest("POST", "/api/admin/events/status", {
        cookie,
        body: {
          eventId: content.openEventId,
          statusOptionId: content.closedStatusOptionId,
        },
      }),
    );
    expect(closeResponse.status).toBe(200);

    const blocked = await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId),
      }),
    );
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).code).toBe("INTAKE_CLOSED");
    expect(await db.eventReservation.count()).toBe(0);

    const reopenResponse = await eventStatusRoute(
      makeRequest("POST", "/api/admin/events/status", {
        cookie,
        body: {
          eventId: content.openEventId,
          statusOptionId: content.openStatusOptionId,
        },
      }),
    );
    expect(reopenResponse.status).toBe(200);

    const allowed = await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId),
      }),
    );
    expect(allowed.status).toBe(201);
    expect(await db.eventReservation.count()).toBe(1);
  });

  test("BZ-001 예약이 쌓여도 상태는 자동으로 바뀌지 않는다", async () => {
    for (let index = 0; index < 5; index += 1) {
      await createEventReservation(
        makeRequest("POST", "/api/event-reservations", {
          body: eventReservationBody(content.openEventId),
        }),
      );
    }

    const response = await publicEvents(makeRequest("GET", "/api/events"));
    const body = await response.json();
    const openEvent = body.items.find(
      (item: { id: string }) => item.id === content.openEventId,
    );
    expect(openEvent.statusLabel).toBe("접수중");
    expect(openEvent.isClosed).toBe(false);
  });
});

describe("BZ-002 개인정보 보유 문구와 파기 기준", () => {
  test("BZ-002 기본 문구는 레거시 동의 문구(EV-0006)와 같다", async () => {
    const response = await privacyNotice();
    const body = await response.json();
    expect(body.courseRetention).toBe(
      "해당 강좌 종강 및 정규 등록 안내 완료 시점 즉시 파기",
    );
    expect(body.purpose).toBe("수강 신청반 좌석 배정 관리 및 예약 확정 안내 문자 발송");
  });

  test("BZ-002 보존 설정을 바꾸면 표시 문구와 저장되는 정책 버전이 함께 바뀐다", async () => {
    const beforeApplication = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const beforeRow = await db.courseApplication.findUniqueOrThrow({
      where: { id: (await beforeApplication.json()).id },
    });
    expect(beforeRow.retentionPolicyVersion).toBe("legacy-ev-0006-v1");

    await retentionPut(
      makeRequest("PUT", "/api/admin/privacy/retention", {
        cookie,
        body: {
          courseRetentionPolicy: "강좌 종료 후 30일 보관 뒤 파기",
          eventRetentionPolicy: "설명회 종료 후 30일 보관 뒤 파기",
          automaticPurgeEnabled: false,
        },
      }),
    );

    const notice = await privacyNotice();
    const noticeBody = await notice.json();
    expect(noticeBody.courseRetention).toBe("강좌 종료 후 30일 보관 뒤 파기");
    expect(noticeBody.eventRetention).toBe("설명회 종료 후 30일 보관 뒤 파기");

    const afterApplication = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const afterRow = await db.courseApplication.findUniqueOrThrow({
      where: { id: (await afterApplication.json()).id },
    });
    expect(afterRow.retentionPolicyVersion).not.toBe("legacy-ev-0006-v1");
    expect(afterRow.retentionPolicyVersion.startsWith("custom-")).toBe(true);
  });

  test("BZ-002 파기 대상 집합은 설정한 파기 시각 기준으로 달라진다", async () => {
    const past = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const future = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );

    await db.courseApplication.update({
      where: { id: (await past.json()).id },
      data: { purgeEligibleAt: new Date("2026-01-01T00:00:00.000Z") },
    });
    await db.courseApplication.update({
      where: { id: (await future.json()).id },
      data: { purgeEligibleAt: new Date("2099-01-01T00:00:00.000Z") },
    });

    const response = await purgeRoute(
      makeRequest("POST", "/api/admin/privacy/purge", {
        cookie,
        body: { dryRun: true },
      }),
    );
    expect((await response.json()).courseApplications).toBe(1);
  });

  test("BZ-002 자동 파기는 기본으로 꺼져 있어 스스로 지우지 않는다", async () => {
    const created = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const { id } = await created.json();
    await db.courseApplication.update({
      where: { id },
      data: { purgeEligibleAt: new Date("2026-01-01T00:00:00.000Z") },
    });

    const setting = await db.privacyRetentionSetting.findUniqueOrThrow({
      where: { id: 1 },
    });
    expect(setting.automaticPurgeEnabled).toBe(false);

    const row = await db.courseApplication.findUniqueOrThrow({ where: { id } });
    expect(row.purgedAt).toBeNull();
    expect(row.studentName).toBe("홍길동");
  });
});

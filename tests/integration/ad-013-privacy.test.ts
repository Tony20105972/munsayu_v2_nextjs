import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { POST as createCourseApplication } from "../../app/api/course-applications/route";
import { POST as createEventReservation } from "../../app/api/event-reservations/route";
import { GET as applicationsGet } from "../../app/api/admin/applications/route";
import { POST as revealRoute } from "../../app/api/admin/applications/reveal/route";
import { GET as exportRoute } from "../../app/api/admin/applications/export/route";
import {
  GET as retentionGet,
  PUT as retentionPut,
} from "../../app/api/admin/privacy/retention/route";
import { POST as purgeScheduleRoute } from "../../app/api/admin/privacy/purge-schedule/route";
import { POST as purgeRoute } from "../../app/api/admin/privacy/purge/route";
import {
  adminCookie,
  courseApplicationBody,
  eventReservationBody,
  makeRequest,
  memberCookie,
  resetDatabase,
  seedContent,
  type SeededContent,
} from "./helpers";

let cookie: string;
let content: SeededContent;

async function applyCourse(overrides: Record<string, unknown> = {}): Promise<string> {
  const response = await createCourseApplication(
    makeRequest("POST", "/api/course-applications", {
      body: courseApplicationBody(content.openCourseId, overrides),
    }),
  );
  expect(response.status).toBe(201);
  return (await response.json()).id;
}

beforeEach(async () => {
  await resetDatabase();
  content = await seedContent();
  cookie = await adminCookie();
});

describe("AD-013 개인정보 열람·내보내기·파기", () => {
  test("AD-013 원문 조회: 감사기록 1건을 남기고 원문을 돌려준다", async () => {
    const id = await applyCourse();

    const response = await revealRoute(
      makeRequest("POST", "/api/admin/applications/reveal", {
        cookie,
        body: { kind: "course", applicationId: id },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body.name).toBe("홍길동");
    expect(body.phone).toBe("010-1234-5678");

    const audits = await db.auditLog.findMany({ where: { action: "PII_VIEW" } });
    expect(audits).toHaveLength(1);
    expect(audits[0].resourceId).toBe(id);
    expect(audits[0].filterSummary).toBeNull();
  });

  test("AD-013 원문 조회: 없는 건이면 404", async () => {
    const response = await revealRoute(
      makeRequest("POST", "/api/admin/applications/reveal", {
        cookie,
        body: { kind: "course", applicationId: "missing-id" },
      }),
    );
    expect(response.status).toBe(404);
    expect(await db.auditLog.count({ where: { action: "PII_VIEW" } })).toBe(0);
  });

  test("AD-013 CSV 내보내기: 페이지가 아니라 필터 결과 전체를 담는다", async () => {
    for (let index = 0; index < 25; index += 1) {
      await applyCourse({ studentName: `홍길동${index}` });
    }

    const list = await applicationsGet(
      makeRequest("GET", "/api/admin/applications?kind=course", { cookie }),
    );
    const listBody = await list.json();
    expect(listBody.items).toHaveLength(20);
    expect(listBody.total).toBe(25);

    const response = await exportRoute(
      makeRequest("GET", "/api/admin/applications/export?kind=course", { cookie }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const csv = await response.text();
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(26);
    expect(lines[0]).toContain("학생이름");

    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: "CSV_EXPORT" },
    });
    expect(audit.filterSummary).toBe("filters=kind;count=25");
  });

  test("AD-013 CSV 내보내기: 필터를 걸면 그 결과만 담고 기록에는 필터 이름만 남는다", async () => {
    await applyCourse({ grade: "초4" });
    await applyCourse({ grade: "초5" });

    const response = await exportRoute(
      makeRequest(
        "GET",
        `/api/admin/applications/export?kind=course&grade=초5&campusId=${content.campusId}`,
        { cookie },
      ),
    );
    const csv = await response.text();
    expect(csv.split("\r\n")).toHaveLength(2);

    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: "CSV_EXPORT" },
    });
    expect(audit.filterSummary).toBe("filters=campusId,grade,kind;count=1");
    expect(audit.filterSummary).not.toContain("홍길동");
    expect(audit.filterSummary).not.toContain("010-");
  });

  test("AD-013 보존 설정: 기본 자동 파기는 꺼져 있다", async () => {
    const response = await retentionGet(
      makeRequest("GET", "/api/admin/privacy/retention", { cookie }),
    );
    const body = await response.json();
    expect(body.automaticPurgeEnabled).toBe(false);
    expect(body.courseRetentionPolicy).toBe(
      "해당 강좌 종강 및 정규 등록 안내 완료 시점 즉시 파기",
    );
  });

  test("AD-013 보존 설정 변경: 감사기록을 남긴다", async () => {
    const response = await retentionPut(
      makeRequest("PUT", "/api/admin/privacy/retention", {
        cookie,
        body: {
          courseRetentionPolicy: "강좌 종료 후 30일 보관 뒤 파기",
          eventRetentionPolicy: "설명회 종료 후 30일 보관 뒤 파기",
          automaticPurgeEnabled: true,
        },
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).automaticPurgeEnabled).toBe(true);

    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: "RETENTION_SETTING_CHANGE" },
    });
    expect(audit.filterSummary).toBe("automaticPurgeEnabled=true");
  });

  test("AD-013 파기 대상 시각 설정: 선택한 건에만 적용되고 기록을 남긴다", async () => {
    const target = await applyCourse();
    const untouched = await applyCourse();

    const response = await purgeScheduleRoute(
      makeRequest("POST", "/api/admin/privacy/purge-schedule", {
        cookie,
        body: {
          kind: "course",
          applicationIds: [target],
          purgeEligibleAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).updated).toBe(1);

    const targetRow = await db.courseApplication.findUniqueOrThrow({
      where: { id: target },
    });
    const untouchedRow = await db.courseApplication.findUniqueOrThrow({
      where: { id: untouched },
    });
    expect(targetRow.purgeEligibleAt).not.toBeNull();
    expect(untouchedRow.purgeEligibleAt).toBeNull();

    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: "PURGE_SCHEDULE_SET" },
    });
    expect(audit.filterSummary).toBe("filters=applicationIds,kind;count=1");
  });

  test("AD-013 파기 실행: dryRun은 건수만 세고 지우지 않는다", async () => {
    const id = await applyCourse();
    await db.courseApplication.update({
      where: { id },
      data: { purgeEligibleAt: new Date("2026-01-01T00:00:00.000Z") },
    });

    const response = await purgeRoute(
      makeRequest("POST", "/api/admin/privacy/purge", {
        cookie,
        body: { dryRun: true },
      }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.dryRun).toBe(true);
    expect(body.courseApplications).toBe(1);
    expect(body.auditId).toBeNull();

    const row = await db.courseApplication.findUniqueOrThrow({ where: { id } });
    expect(row.studentName).toBe("홍길동");
    expect(row.purgedAt).toBeNull();
    expect(await db.auditLog.count({ where: { action: "PII_PURGE" } })).toBe(0);
  });

  test("AD-013 파기 실행: 실제 파기는 행을 남기고 개인정보만 비식별화한다", async () => {
    const courseId = await applyCourse();
    const eventResponse = await createEventReservation(
      makeRequest("POST", "/api/event-reservations", {
        body: eventReservationBody(content.openEventId),
      }),
    );
    const eventId = (await eventResponse.json()).id;

    await db.courseApplication.update({
      where: { id: courseId },
      data: { purgeEligibleAt: new Date("2026-01-01T00:00:00.000Z") },
    });
    await db.eventReservation.update({
      where: { id: eventId },
      data: { purgeEligibleAt: new Date("2026-01-01T00:00:00.000Z") },
    });

    const response = await purgeRoute(
      makeRequest("POST", "/api/admin/privacy/purge", {
        cookie,
        body: { dryRun: false },
      }),
    );
    const body = await response.json();
    expect(body.dryRun).toBe(false);
    expect(body.courseApplications).toBe(1);
    expect(body.eventReservations).toBe(1);
    expect(typeof body.auditId).toBe("string");

    const courseRow = await db.courseApplication.findUniqueOrThrow({
      where: { id: courseId },
    });
    expect(courseRow.studentName).toBe("파기됨");
    expect(courseRow.guardianPhone).toBe("파기됨");
    expect(courseRow.schoolName).toBe("파기됨");
    expect(courseRow.grade).toBe("초4");
    expect(courseRow.purgedAt).not.toBeNull();

    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: "PII_PURGE" },
    });
    expect(audit.filterSummary).toBe("course=1;event=1");
  });

  test("AD-013 파기 실행: 보존 기간이 남은 건은 지우지 않는다", async () => {
    const id = await applyCourse();
    await db.courseApplication.update({
      where: { id },
      data: { purgeEligibleAt: new Date("2099-01-01T00:00:00.000Z") },
    });

    const response = await purgeRoute(
      makeRequest("POST", "/api/admin/privacy/purge", {
        cookie,
        body: { dryRun: false },
      }),
    );
    expect((await response.json()).courseApplications).toBe(0);

    const row = await db.courseApplication.findUniqueOrThrow({ where: { id } });
    expect(row.studentName).toBe("홍길동");
  });

  test("AD-013 파기 실행: 예약 실행 비밀값으로도 호출할 수 있다", async () => {
    const id = await applyCourse();
    await db.courseApplication.update({
      where: { id },
      data: { purgeEligibleAt: new Date("2026-01-01T00:00:00.000Z") },
    });

    const response = await purgeRoute(
      makeRequest("POST", "/api/admin/privacy/purge", {
        headers: { "x-purge-secret": process.env.PRIVACY_PURGE_SECRET ?? "" },
        body: { dryRun: false },
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).courseApplications).toBe(1);

    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: "PII_PURGE" },
    });
    expect(audit.actorUserId).toBeNull();
  });

  test("AD-013 파기 실행: 비밀값이 틀리면 401", async () => {
    const response = await purgeRoute(
      makeRequest("POST", "/api/admin/privacy/purge", {
        headers: { "x-purge-secret": "wrong-secret" },
        body: { dryRun: true },
      }),
    );
    expect(response.status).toBe(401);
  });

  test("AD-013 파기 실행: 비밀값이 설정되지 않은 환경에서는 헤더 경로가 동작하지 않는다", async () => {
    const previous = process.env.PRIVACY_PURGE_SECRET;
    delete process.env.PRIVACY_PURGE_SECRET;

    const unset = await purgeRoute(
      makeRequest("POST", "/api/admin/privacy/purge", {
        headers: { "x-purge-secret": previous ?? "whatever" },
        body: { dryRun: true },
      }),
    );
    expect(unset.status).toBe(401);
    expect((await unset.json()).code).toBe("UNAUTHENTICATED");

    process.env.PRIVACY_PURGE_SECRET = "";
    const empty = await purgeRoute(
      makeRequest("POST", "/api/admin/privacy/purge", {
        headers: { "x-purge-secret": "" },
        body: { dryRun: true },
      }),
    );
    expect(empty.status).toBe(401);

    process.env.PRIVACY_PURGE_SECRET = previous;
  });

  test("AD-013 파기 실행: 회원 세션으로는 403", async () => {
    const memberSession = await memberCookie();

    const response = await purgeRoute(
      makeRequest("POST", "/api/admin/privacy/purge", {
        cookie: memberSession,
        body: { dryRun: true },
      }),
    );
    expect(response.status).toBe(403);
  });

  test("AD-013 파기된 건은 예약 조회에서 더 이상 본인 확인으로 찾히지 않는다", async () => {
    const id = await applyCourse();
    await db.courseApplication.update({
      where: { id },
      data: { purgeEligibleAt: new Date("2026-01-01T00:00:00.000Z") },
    });
    await purgeRoute(
      makeRequest("POST", "/api/admin/privacy/purge", {
        cookie,
        body: { dryRun: false },
      }),
    );

    const rows = await db.courseApplication.findMany({
      where: { studentName: "홍길동", purgedAt: null },
    });
    expect(rows).toHaveLength(0);
  });
});

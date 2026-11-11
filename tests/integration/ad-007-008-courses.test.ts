import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { POST as createCourseApplication } from "../../app/api/course-applications/route";
import {
  GET as coursesGet,
  POST as coursesPost,
} from "../../app/api/admin/courses/route";
import {
  PUT as coursePut,
  DELETE as courseDelete,
} from "../../app/api/admin/courses/[id]/route";
import { GET as applicationsGet } from "../../app/api/admin/applications/route";
import { GET as applicationDetail } from "../../app/api/admin/applications/detail/route";
import { GET as publicCourses } from "../../app/api/courses/route";
import {
  adminCookie,
  courseApplicationBody,
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

describe("AD-007/008 시간표·강좌 신청 관리", () => {
  test("AD-007 강좌 추가·수정·삭제가 된다", async () => {
    const created = await coursesPost(
      makeRequest("POST", "/api/admin/courses", {
        cookie,
        body: {
          campusId: content.campusId,
          title: "3학년 독해/어휘반(주중반) 4회",
          sectionTitle: "정규강좌",
          gradeTitle: "초등학교 3학년",
          scheduleText: "화,수,목,금 15/18시",
          startDate: "2027-03-02T00:00:00.000Z",
          displayOrder: 9,
          intakeOpen: true,
        },
      }),
    );
    expect(created.status).toBe(201);
    const { id } = await created.json();

    const updated = await coursePut(
      makeRequest("PUT", `/api/admin/courses/${id}`, {
        cookie,
        body: {
          campusId: content.secondCampusId,
          title: "3학년 독해/어휘반(주말반) 8회",
          displayOrder: 3,
          intakeOpen: false,
        },
      }),
      routeContext({ id }),
    );
    expect(updated.status).toBe(200);

    const saved = await db.course.findUniqueOrThrow({ where: { id } });
    expect(saved.campusId).toBe(content.secondCampusId);
    expect(saved.intakeStatus).toBe("CLOSED");

    const deleted = await courseDelete(
      makeRequest("DELETE", `/api/admin/courses/${id}`, { cookie }),
      routeContext({ id }),
    );
    expect(deleted.status).toBe(200);
  });

  test("AD-007 강좌 추가: 없는 지점이면 422", async () => {
    const response = await coursesPost(
      makeRequest("POST", "/api/admin/courses", {
        cookie,
        body: { campusId: "missing-id", title: "테스트 강좌" },
      }),
    );
    expect(response.status).toBe(422);
    expect(Object.keys((await response.json()).fieldErrors)).toContain("campusId");
  });

  test("AD-007 강좌 삭제: 신청 기록이 있으면 409로 막는다", async () => {
    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );

    const response = await courseDelete(
      makeRequest("DELETE", `/api/admin/courses/${content.openCourseId}`, { cookie }),
      routeContext({ id: content.openCourseId }),
    );
    expect(response.status).toBe(409);
  });

  test("AD-007 강좌 목록: 지점과 접수상태로 걸러진다", async () => {
    const all = await coursesGet(makeRequest("GET", "/api/admin/courses", { cookie }));
    expect((await all.json()).total).toBe(2);

    const byCampus = await coursesGet(
      makeRequest("GET", `/api/admin/courses?campusId=${content.secondCampusId}`, {
        cookie,
      }),
    );
    expect((await byCampus.json()).total).toBe(0);

    const openOnly = await coursesGet(
      makeRequest("GET", "/api/admin/courses?intakeOpen=true", { cookie }),
    );
    const openBody = await openOnly.json();
    expect(openBody.total).toBe(1);
    expect(openBody.items[0].id).toBe(content.openCourseId);
  });

  test("AD-007 강좌 목록: 신청현황 건수를 함께 보여 준다", async () => {
    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );

    const response = await coursesGet(
      makeRequest("GET", "/api/admin/courses?intakeOpen=true", { cookie }),
    );
    expect((await response.json()).items[0].applicationCount).toBe(1);
  });

  test("AD-008 신청 목록: 이름·연락처는 가려서 내려온다", async () => {
    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );

    const response = await applicationsGet(
      makeRequest("GET", "/api/admin/applications?kind=course", { cookie }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body.total).toBe(1);
    expect(body.items[0].maskedName).toBe("홍*동");
    expect(body.items[0].maskedPhone).toBe("010-****-5678");
    expect(JSON.stringify(body)).not.toContain("홍길동");
    expect(JSON.stringify(body)).not.toContain("010-1234-5678");
    expect(JSON.stringify(body)).not.toContain("가상초등학교");
  });

  test("AD-008 신청 목록: 지점·상태·학년 필터가 적용된다", async () => {
    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId, { grade: "초4" }),
      }),
    );
    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId, { grade: "초5" }),
      }),
    );

    const byGrade = await applicationsGet(
      makeRequest("GET", "/api/admin/applications?kind=course&grade=초5", { cookie }),
    );
    expect((await byGrade.json()).total).toBe(1);

    const byCampus = await applicationsGet(
      makeRequest(
        "GET",
        `/api/admin/applications?kind=course&campusId=${content.secondCampusId}`,
        { cookie },
      ),
    );
    expect((await byCampus.json()).total).toBe(0);

    const byStatus = await applicationsGet(
      makeRequest("GET", "/api/admin/applications?kind=course&status=CANCELLED", {
        cookie,
      }),
    );
    expect((await byStatus.json()).total).toBe(0);
  });

  test("AD-008 신청 상세: 원문 조회 전에는 학교명까지 가린다", async () => {
    const created = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const { id } = await created.json();

    const response = await applicationDetail(
      makeRequest(
        "GET",
        `/api/admin/applications/detail?kind=course&applicationId=${id}`,
        { cookie },
      ),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.maskedSchoolName).toBe("가상****");
    expect(JSON.stringify(body)).not.toContain("가상초등학교");
    // 마스킹 조회는 감사기록 대상이 아니다.
    expect(await db.auditLog.count({ where: { action: "PII_VIEW" } })).toBe(0);
  });

  test("AD-008 공개 시간표는 지점별로 출력순서대로 내려온다", async () => {
    const response = await publicCourses(makeRequest("GET", "/api/courses"));
    const body = await response.json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0].displayOrder).toBeUndefined();
    expect(body.items[0].intakeOpen).toBe(true);
    expect(body.items[1].intakeOpen).toBe(false);
  });
});

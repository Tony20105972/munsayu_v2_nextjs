import { makeRequest, routeContext } from "./helpers";

import { GET as applicationsGet } from "../../app/api/admin/applications/route";
import { POST as applicationsReveal } from "../../app/api/admin/applications/reveal/route";
import { GET as applicationsExport } from "../../app/api/admin/applications/export/route";
import { GET as applicationsDetail } from "../../app/api/admin/applications/detail/route";
import {
  GET as retentionGet,
  PUT as retentionPut,
} from "../../app/api/admin/privacy/retention/route";
import { POST as purgeSchedule } from "../../app/api/admin/privacy/purge-schedule/route";
import { POST as purgeRun } from "../../app/api/admin/privacy/purge/route";
import {
  GET as coursesGet,
  POST as coursesPost,
} from "../../app/api/admin/courses/route";
import {
  PUT as coursePut,
  DELETE as courseDelete,
} from "../../app/api/admin/courses/[id]/route";
import { POST as courseIntake } from "../../app/api/admin/courses/intake/route";
import { GET as eventsGet, POST as eventsPost } from "../../app/api/admin/events/route";
import {
  PUT as eventPut,
  DELETE as eventDelete,
} from "../../app/api/admin/events/[id]/route";
import { GET as eventTotals } from "../../app/api/admin/events/[id]/totals/route";
import { POST as eventStatus } from "../../app/api/admin/events/status/route";
import {
  GET as statusOptionsGet,
  POST as statusOptionsPost,
} from "../../app/api/admin/event-status-options/route";
import {
  GET as instructorsGet,
  POST as instructorsPost,
} from "../../app/api/admin/instructors/route";
import {
  PUT as instructorPut,
  DELETE as instructorDelete,
} from "../../app/api/admin/instructors/[id]/route";
import {
  POST as membershipPost,
  DELETE as membershipDelete,
} from "../../app/api/admin/instructors/memberships/route";
import {
  GET as teamsGet,
  POST as teamsPost,
} from "../../app/api/admin/instructor-teams/route";
import { GET as membersGet } from "../../app/api/admin/members/route";
import { POST as memberStatus } from "../../app/api/admin/members/status/route";
import { POST as adminsPost } from "../../app/api/admin/admins/route";
import { DELETE as adminDelete } from "../../app/api/admin/admins/[id]/route";

export type AdminRouteCase = {
  name: string;
  invoke: (cookie?: string) => Promise<Response>;
};

/**
 * 관리자 API 전 경로 목록. 권한 테스트가 이 목록을 순회하므로
 * 새 관리자 경로를 추가하면 여기에도 반드시 넣는다. (Phase 4 Gate)
 */
export const ADMIN_ROUTE_CASES: AdminRouteCase[] = [
  {
    name: "GET /api/admin/applications",
    invoke: (cookie) =>
      applicationsGet(
        makeRequest("GET", "/api/admin/applications?kind=course", { cookie }),
      ),
  },
  {
    name: "POST /api/admin/applications/reveal",
    invoke: (cookie) =>
      applicationsReveal(
        makeRequest("POST", "/api/admin/applications/reveal", {
          cookie,
          body: { kind: "course", applicationId: "missing-id" },
        }),
      ),
  },
  {
    name: "GET /api/admin/applications/export",
    invoke: (cookie) =>
      applicationsExport(
        makeRequest("GET", "/api/admin/applications/export?kind=course", { cookie }),
      ),
  },
  {
    name: "GET /api/admin/applications/detail",
    invoke: (cookie) =>
      applicationsDetail(
        makeRequest(
          "GET",
          "/api/admin/applications/detail?kind=course&applicationId=missing-id",
          { cookie },
        ),
      ),
  },
  {
    name: "GET /api/admin/privacy/retention",
    invoke: (cookie) =>
      retentionGet(makeRequest("GET", "/api/admin/privacy/retention", { cookie })),
  },
  {
    name: "PUT /api/admin/privacy/retention",
    invoke: (cookie) =>
      retentionPut(
        makeRequest("PUT", "/api/admin/privacy/retention", {
          cookie,
          body: {
            courseRetentionPolicy: "테스트 보존 문구",
            eventRetentionPolicy: "테스트 보존 문구",
            automaticPurgeEnabled: false,
          },
        }),
      ),
  },
  {
    name: "POST /api/admin/privacy/purge-schedule",
    invoke: (cookie) =>
      purgeSchedule(
        makeRequest("POST", "/api/admin/privacy/purge-schedule", {
          cookie,
          body: {
            kind: "course",
            applicationIds: ["missing-id"],
            purgeEligibleAt: "2027-01-01T00:00:00.000Z",
          },
        }),
      ),
  },
  {
    name: "POST /api/admin/privacy/purge",
    invoke: (cookie) =>
      purgeRun(
        makeRequest("POST", "/api/admin/privacy/purge", {
          cookie,
          body: { dryRun: true },
        }),
      ),
  },
  {
    name: "GET /api/admin/courses",
    invoke: (cookie) =>
      coursesGet(makeRequest("GET", "/api/admin/courses", { cookie })),
  },
  {
    name: "POST /api/admin/courses",
    invoke: (cookie) =>
      coursesPost(
        makeRequest("POST", "/api/admin/courses", {
          cookie,
          body: { campusId: "missing-id", title: "테스트 강좌" },
        }),
      ),
  },
  {
    name: "PUT /api/admin/courses/[id]",
    invoke: (cookie) =>
      coursePut(
        makeRequest("PUT", "/api/admin/courses/missing-id", {
          cookie,
          body: { campusId: "missing-id", title: "테스트 강좌" },
        }),
        routeContext({ id: "missing-id" }),
      ),
  },
  {
    name: "DELETE /api/admin/courses/[id]",
    invoke: (cookie) =>
      courseDelete(
        makeRequest("DELETE", "/api/admin/courses/missing-id", { cookie }),
        routeContext({ id: "missing-id" }),
      ),
  },
  {
    name: "POST /api/admin/courses/intake",
    invoke: (cookie) =>
      courseIntake(
        makeRequest("POST", "/api/admin/courses/intake", {
          cookie,
          body: { courseId: "missing-id", intakeOpen: false },
        }),
      ),
  },
  {
    name: "GET /api/admin/events",
    invoke: (cookie) => eventsGet(makeRequest("GET", "/api/admin/events", { cookie })),
  },
  {
    name: "POST /api/admin/events",
    invoke: (cookie) =>
      eventsPost(
        makeRequest("POST", "/api/admin/events", {
          cookie,
          body: {
            managementCode: "TEST-1",
            title: "테스트 설명회",
            startsAt: "2027-02-20T02:00:00.000Z",
            statusOptionId: "missing-id",
          },
        }),
      ),
  },
  {
    name: "PUT /api/admin/events/[id]",
    invoke: (cookie) =>
      eventPut(
        makeRequest("PUT", "/api/admin/events/missing-id", {
          cookie,
          body: {
            managementCode: "TEST-1",
            title: "테스트 설명회",
            startsAt: "2027-02-20T02:00:00.000Z",
            statusOptionId: "missing-id",
          },
        }),
        routeContext({ id: "missing-id" }),
      ),
  },
  {
    name: "DELETE /api/admin/events/[id]",
    invoke: (cookie) =>
      eventDelete(
        makeRequest("DELETE", "/api/admin/events/missing-id", { cookie }),
        routeContext({ id: "missing-id" }),
      ),
  },
  {
    name: "GET /api/admin/events/[id]/totals",
    invoke: (cookie) =>
      eventTotals(
        makeRequest("GET", "/api/admin/events/missing-id/totals", { cookie }),
        routeContext({ id: "missing-id" }),
      ),
  },
  {
    name: "POST /api/admin/events/status",
    invoke: (cookie) =>
      eventStatus(
        makeRequest("POST", "/api/admin/events/status", {
          cookie,
          body: { eventId: "missing-id", statusOptionId: "missing-id" },
        }),
      ),
  },
  {
    name: "GET /api/admin/event-status-options",
    invoke: (cookie) =>
      statusOptionsGet(
        makeRequest("GET", "/api/admin/event-status-options", { cookie }),
      ),
  },
  {
    name: "POST /api/admin/event-status-options",
    invoke: (cookie) =>
      statusOptionsPost(
        makeRequest("POST", "/api/admin/event-status-options", {
          cookie,
          body: { label: "테스트상태", sortOrder: 9, isClosed: false },
        }),
      ),
  },
  {
    name: "GET /api/admin/instructors",
    invoke: (cookie) =>
      instructorsGet(makeRequest("GET", "/api/admin/instructors", { cookie })),
  },
  {
    name: "POST /api/admin/instructors",
    invoke: (cookie) =>
      instructorsPost(
        makeRequest("POST", "/api/admin/instructors", {
          cookie,
          body: { name: "가상강사", profileCode: "tch-test" },
        }),
      ),
  },
  {
    name: "PUT /api/admin/instructors/[id]",
    invoke: (cookie) =>
      instructorPut(
        makeRequest("PUT", "/api/admin/instructors/missing-id", {
          cookie,
          body: { name: "가상강사", profileCode: "tch-test" },
        }),
        routeContext({ id: "missing-id" }),
      ),
  },
  {
    name: "DELETE /api/admin/instructors/[id]",
    invoke: (cookie) =>
      instructorDelete(
        makeRequest("DELETE", "/api/admin/instructors/missing-id", { cookie }),
        routeContext({ id: "missing-id" }),
      ),
  },
  {
    name: "POST /api/admin/instructors/memberships",
    invoke: (cookie) =>
      membershipPost(
        makeRequest("POST", "/api/admin/instructors/memberships", {
          cookie,
          body: { instructorId: "missing-id", teamId: "missing-id", displayOrder: 1 },
        }),
      ),
  },
  {
    name: "DELETE /api/admin/instructors/memberships",
    invoke: (cookie) =>
      membershipDelete(
        makeRequest("DELETE", "/api/admin/instructors/memberships", {
          cookie,
          body: { instructorId: "missing-id", teamId: "missing-id" },
        }),
      ),
  },
  {
    name: "GET /api/admin/instructor-teams",
    invoke: (cookie) =>
      teamsGet(makeRequest("GET", "/api/admin/instructor-teams", { cookie })),
  },
  {
    name: "POST /api/admin/instructor-teams",
    invoke: (cookie) =>
      teamsPost(
        makeRequest("POST", "/api/admin/instructor-teams", {
          cookie,
          body: { name: "테스트팀" },
        }),
      ),
  },
  {
    name: "GET /api/admin/members",
    invoke: (cookie) =>
      membersGet(makeRequest("GET", "/api/admin/members", { cookie })),
  },
  {
    name: "POST /api/admin/members/status",
    invoke: (cookie) =>
      memberStatus(
        makeRequest("POST", "/api/admin/members/status", {
          cookie,
          body: { userId: "missing-id", status: "BLOCKED" },
        }),
      ),
  },
  {
    name: "POST /api/admin/admins",
    invoke: (cookie) =>
      adminsPost(
        makeRequest("POST", "/api/admin/admins", {
          cookie,
          body: {
            loginId: "newadmin",
            password: "fake-admin-pw-0002",
            name: "가상관리자2",
            email: "newadmin@example.test",
            phone: "010-0000-0002",
          },
        }),
      ),
  },
  {
    name: "DELETE /api/admin/admins/[id]",
    invoke: (cookie) =>
      adminDelete(
        makeRequest("DELETE", "/api/admin/admins/missing-id", { cookie }),
        routeContext({ id: "missing-id" }),
      ),
  },
];

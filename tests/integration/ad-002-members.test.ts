import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { GET as membersGet } from "../../app/api/admin/members/route";
import { POST as memberStatusRoute } from "../../app/api/admin/members/status/route";
import { POST as adminsPost } from "../../app/api/admin/admins/route";
import { DELETE as adminDelete } from "../../app/api/admin/admins/[id]/route";
import {
  FAKE,
  adminCookie,
  createAdminUser,
  createMemberUser,
  login,
  makeRequest,
  resetDatabase,
  routeContext,
} from "./helpers";
import { fixturePassword } from "../fixtures/passwords";

let cookie: string;

beforeEach(async () => {
  await resetDatabase();
  cookie = await adminCookie();
});

describe("AD-002 회원 관리", () => {
  test("AD-002 회원 검색: 목록의 이름·연락처·이메일은 가려서 내려온다", async () => {
    await createMemberUser("member001");

    const response = await membersGet(
      makeRequest("GET", "/api/admin/members?keyword=member", { cookie }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body.items).toHaveLength(1);
    const row = body.items[0];
    expect(row.maskedName).toBe("가**원");
    expect(row.maskedPhone).toBe("010-****-0001");
    expect(row.maskedEmail).toMatch(/^m\*+@example\.test$/);
    expect(JSON.stringify(row)).not.toContain("가상회원");
    expect(JSON.stringify(row)).not.toContain("010-0000-0001");
  });

  test("AD-002 회원 검색: 상태로 걸러진다", async () => {
    await createMemberUser("member001");
    const blocked = await createMemberUser("member002");
    await db.user.update({ where: { id: blocked.id }, data: { status: "BLOCKED" } });

    const response = await membersGet(
      makeRequest("GET", "/api/admin/members?status=BLOCKED", { cookie }),
    );
    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].loginId).toBe("member002");
    expect(body.counts.BLOCKED).toBe(1);
  });

  test("AD-002 회원 상태 변경: 차단하면 감사기록이 남고 로그인할 수 없다", async () => {
    const member = await createMemberUser("member001", FAKE.memberPassword);

    const response = await memberStatusRoute(
      makeRequest("POST", "/api/admin/members/status", {
        cookie,
        body: { userId: member.id, status: "BLOCKED" },
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("BLOCKED");

    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: "MEMBER_STATUS_CHANGE" },
    });
    expect(audit.resourceId).toBe(member.id);
    expect(audit.filterSummary).toBe("status=BLOCKED");

    const { response: loginResponse } = await login("member001", FAKE.memberPassword);
    expect(loginResponse.status).toBe(401);
  });

  test("AD-002 회원 상태 변경: 없는 회원이면 404", async () => {
    const response = await memberStatusRoute(
      makeRequest("POST", "/api/admin/members/status", {
        cookie,
        body: { userId: "missing-id", status: "BLOCKED" },
      }),
    );
    expect(response.status).toBe(404);
  });

  test("AD-002 관리자 계정 추가: 감사기록을 남기고 관리자로 로그인할 수 있다", async () => {
    const response = await adminsPost(
      makeRequest("POST", "/api/admin/admins", {
        cookie,
        body: {
          loginId: "secondadmin",
          password: fixturePassword("admin-0003"),
          name: "가상관리자2",
          email: "secondadmin@example.test",
          phone: "010-0000-0003",
        },
      }),
    );
    expect(response.status).toBe(201);

    const audit = await db.auditLog.findFirstOrThrow({
      where: { action: "ADMIN_ACCOUNT_CREATE" },
    });
    expect(audit.resourceId).toBe((await response.json()).id);

    const { response: loginResponse, cookie: newCookie } = await login(
      "secondadmin",
      fixturePassword("admin-0003"),
    );
    expect(loginResponse.status).toBe(200);
    expect(newCookie).toContain("munsayu_admin_session=");
  });

  test("AD-002 관리자 계정 추가: 아이디가 겹치면 409", async () => {
    const response = await adminsPost(
      makeRequest("POST", "/api/admin/admins", {
        cookie,
        body: {
          loginId: FAKE.adminLoginId,
          password: fixturePassword("admin-0004"),
          name: "가상관리자3",
          email: "thirdadmin@example.test",
          phone: "010-0000-0004",
        },
      }),
    );
    expect(response.status).toBe(409);
  });

  test("AD-002 관리자 계정 삭제: 감사기록을 남긴다", async () => {
    const created = await adminsPost(
      makeRequest("POST", "/api/admin/admins", {
        cookie,
        body: {
          loginId: "deletable",
          password: fixturePassword("admin-0005"),
          name: "가상관리자4",
          email: "deletable@example.test",
          phone: "010-0000-0005",
        },
      }),
    );
    const { id } = await created.json();

    const response = await adminDelete(
      makeRequest("DELETE", `/api/admin/admins/${id}`, { cookie }),
      routeContext({ id }),
    );
    expect(response.status).toBe(200);
    expect(await db.user.findUnique({ where: { id } })).toBeNull();
    expect(
      await db.auditLog.count({
        where: { action: "ADMIN_ACCOUNT_DELETE", resourceId: id },
      }),
    ).toBe(1);
  });

  test("AD-002 관리자 계정 삭제: 자기 계정은 지울 수 없다", async () => {
    // 마지막 관리자 규칙과 섞이지 않게 관리자를 한 명 더 만들어 둔다.
    await createAdminUser("backupadmin", fixturePassword("admin-0006"));
    const admin = await db.user.findFirstOrThrow({
      where: { loginId: FAKE.adminLoginId },
    });

    const response = await adminDelete(
      makeRequest("DELETE", `/api/admin/admins/${admin.id}`, { cookie }),
      routeContext({ id: admin.id }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("FORBIDDEN");
    expect(await db.user.findUnique({ where: { id: admin.id } })).not.toBeNull();
  });

  test("AD-002 관리자 계정 삭제: 마지막 관리자 계정은 409로 막는다", async () => {
    const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    expect(await db.user.count({ where: { role: "ADMIN" } })).toBe(1);

    const response = await adminDelete(
      makeRequest("DELETE", `/api/admin/admins/${admin.id}`, { cookie }),
      routeContext({ id: admin.id }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("CONFLICT");
    expect(await db.user.count({ where: { role: "ADMIN" } })).toBe(1);
  });

  test("AD-002 관리자 계정 삭제: 관리자가 둘이면 다른 관리자는 지울 수 있고 마지막 한 명은 남는다", async () => {
    const second = await createAdminUser("backupadmin", fixturePassword("admin-0006"));

    const deleted = await adminDelete(
      makeRequest("DELETE", `/api/admin/admins/${second.id}`, { cookie }),
      routeContext({ id: second.id }),
    );
    expect(deleted.status).toBe(200);
    expect(await db.user.count({ where: { role: "ADMIN" } })).toBe(1);

    const last = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const blocked = await adminDelete(
      makeRequest("DELETE", `/api/admin/admins/${last.id}`, { cookie }),
      routeContext({ id: last.id }),
    );
    expect(blocked.status).toBe(409);
  });

  test("AD-002 관리자 계정 삭제: 회원 계정은 이 경로로 지울 수 없다", async () => {
    const member = await createMemberUser("member001");

    const response = await adminDelete(
      makeRequest("DELETE", `/api/admin/admins/${member.id}`, { cookie }),
      routeContext({ id: member.id }),
    );
    expect(response.status).toBe(404);
    expect(await db.user.findUnique({ where: { id: member.id } })).not.toBeNull();
  });
});

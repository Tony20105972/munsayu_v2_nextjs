import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { GET as applicationsGet } from "../../app/api/admin/applications/route";
import { ADMIN_ROUTE_CASES } from "./admin-routes";
import {
  FAKE,
  adminCookie,
  login,
  makeRequest,
  memberCookie,
  resetDatabase,
} from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

describe("AD-001 관리자 로그인과 권한", () => {
  test("AD-001 관리자 로그인: 관리자 쿠키를 발급한다", async () => {
    const cookie = await adminCookie();
    expect(cookie).toContain("munsayu_admin_session=");
    expect(cookie).not.toContain("munsayu_member_session=");

    const session = await db.authSession.findFirstOrThrow();
    expect(session.scope).toBe("ADMIN");
    // 토큰 원문은 저장하지 않는다.
    expect(session.tokenHash).toHaveLength(64);

    const response = await applicationsGet(
      makeRequest("GET", "/api/admin/applications?kind=course", { cookie }),
    );
    expect(response.status).toBe(200);
  });

  test("AD-001 관리자 로그인: 회원 로그인은 회원 쿠키만 받는다", async () => {
    const cookie = await memberCookie();
    expect(cookie).toContain("munsayu_member_session=");
    expect(cookie).not.toContain("munsayu_admin_session=");
  });

  test("AD-001 관리자 로그인: 비밀번호가 틀리면 401", async () => {
    await db.user.create({
      data: {
        loginId: FAKE.adminLoginId,
        passwordHash: "$argon2id$invalid",
        name: "가상관리자",
        email: "admin@example.test",
        phone: "010-0000-0000",
        role: "ADMIN",
      },
    });

    const { response } = await login(FAKE.adminLoginId, FAKE.adminPassword);
    expect(response.status).toBe(401);
  });

  test("AD-001 관리자 경로 목록이 비어 있지 않다", () => {
    expect(ADMIN_ROUTE_CASES.length).toBeGreaterThanOrEqual(30);
  });

  describe("AD-001 관리자 전 경로 권한 확인", () => {
    for (const routeCase of ADMIN_ROUTE_CASES) {
      test(`AD-001 ${routeCase.name}: 비로그인 요청은 401`, async () => {
        const response = await routeCase.invoke();
        expect(response.status).toBe(401);
        expect((await response.json()).code).toBe("UNAUTHENTICATED");
      });

      test(`AD-001 ${routeCase.name}: 회원 세션 요청은 403`, async () => {
        const cookie = await memberCookie();
        const response = await routeCase.invoke(cookie);
        expect(response.status).toBe(403);
        expect((await response.json()).code).toBe("FORBIDDEN");
      });
    }
  });
});

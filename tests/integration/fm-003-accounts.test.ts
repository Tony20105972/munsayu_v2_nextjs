import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { getMemoryMailAdapter } from "@/server/adapters/mail";
import { hashToken } from "@/server/auth/tokens";
import { POST as registerRoute } from "../../app/api/auth/register/route";
import { POST as logoutRoute } from "../../app/api/auth/logout/route";
import { POST as findLoginIdRoute } from "../../app/api/auth/find-login-id/route";
import { POST as resetRequestRoute } from "../../app/api/auth/password-reset/request/route";
import { POST as resetConfirmRoute } from "../../app/api/auth/password-reset/confirm/route";
import { PATCH as profileRoute } from "../../app/api/account/profile/route";
import { POST as withdrawRoute } from "../../app/api/account/withdraw/route";
import { GET as sessionRoute } from "../../app/api/auth/session/route";
import { cookiesFrom, login, makeRequest, resetDatabase } from "./helpers";
import { fixturePassword } from "../fixtures/passwords";

const REGISTER_BODY = {
  loginId: "newmember",
  password: fixturePassword("member-0001"),
  passwordConfirm: fixturePassword("member-0001"),
  name: "가상회원",
  email: "newmember@example.test",
  phone: "010-1111-2222",
  termsConsent: true,
  privacyConsent: true,
} as const;

async function register(overrides: Record<string, unknown> = {}): Promise<Response> {
  return registerRoute(
    makeRequest("POST", "/api/auth/register", {
      body: { ...REGISTER_BODY, ...overrides },
    }),
  );
}

function resetTokenFromMail(): string {
  const messages = getMemoryMailAdapter().sent();
  const last = messages[messages.length - 1];
  const match = /token=([A-Za-z0-9_-]+)/.exec(last.text);
  if (!match) throw new Error("재설정 토큰을 메일 본문에서 찾을 수 없습니다.");
  return match[1];
}

beforeEach(async () => {
  await resetDatabase();
});

describe("FM-003 공개 회원 lifecycle", () => {
  test("FM-003 회원가입: 201과 회원 세션 쿠키를 발급한다", async () => {
    const response = await register();
    expect(response.status).toBe(201);

    const cookies = response.headers.getSetCookie();
    expect(cookies.some((cookie) => cookie.startsWith("munsayu_member_session="))).toBe(
      true,
    );
    expect(cookies.some((cookie) => cookie.includes("HttpOnly"))).toBe(true);
    expect(cookies.some((cookie) => cookie.includes("SameSite=Lax"))).toBe(true);

    const user = await db.user.findUniqueOrThrow({ where: { loginId: "newmember" } });
    expect(user.role).toBe("MEMBER");
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  test("FM-003 회원가입: 아이디 중복이면 409", async () => {
    await register();
    const response = await register({ email: "other@example.test" });
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("CONFLICT");
  });

  test("FM-003 회원가입: 이메일 중복이면 409", async () => {
    await register();
    const response = await register({ loginId: "othermember" });
    expect(response.status).toBe(409);
  });

  test("FM-003 회원가입: 비밀번호 확인이 다르면 422", async () => {
    const response = await register({ passwordConfirm: fixturePassword("other-0002") });
    expect(response.status).toBe(422);
    expect(Object.keys((await response.json()).fieldErrors)).toContain(
      "passwordConfirm",
    );
  });

  test("FM-003 로그인·로그아웃: 세션을 만들고 지운다", async () => {
    await register();
    const { response, cookie } = await login(
      REGISTER_BODY.loginId,
      REGISTER_BODY.password,
    );
    expect(response.status).toBe(200);
    expect(await db.authSession.count({ where: { scope: "MEMBER" } })).toBeGreaterThan(
      0,
    );

    const before = await sessionRoute(
      makeRequest("GET", "/api/auth/session", { cookie }),
    );
    expect((await before.json()).user.loginId).toBe(REGISTER_BODY.loginId);

    const logout = await logoutRoute(
      makeRequest("POST", "/api/auth/logout", { cookie }),
    );
    expect(logout.status).toBe(204);

    const after = await sessionRoute(
      makeRequest("GET", "/api/auth/session", { cookie }),
    );
    expect((await after.json()).user).toBeNull();
  });

  test("FM-003 로그인: rememberMe가 켜지면 Max-Age가 붙는다", async () => {
    await register();

    const withoutRemember = await login(REGISTER_BODY.loginId, REGISTER_BODY.password);
    const withRemember = await login(
      REGISTER_BODY.loginId,
      REGISTER_BODY.password,
      true,
    );

    const plain = withoutRemember.response.headers.getSetCookie().join(";");
    const remembered = withRemember.response.headers.getSetCookie().join(";");
    expect(plain).not.toContain("Max-Age");
    expect(remembered).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
  });

  test("FM-003 로그인: 차단된 계정은 401", async () => {
    await register();
    await db.user.update({
      where: { loginId: REGISTER_BODY.loginId },
      data: { status: "BLOCKED" },
    });

    const { response } = await login(REGISTER_BODY.loginId, REGISTER_BODY.password);
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("UNAUTHENTICATED");
  });

  test("FM-003 탈퇴: 탈퇴한 계정은 다시 로그인할 수 없다", async () => {
    await register();
    const { cookie } = await login(REGISTER_BODY.loginId, REGISTER_BODY.password);

    const withdraw = await withdrawRoute(
      makeRequest("POST", "/api/account/withdraw", {
        cookie,
        body: { password: REGISTER_BODY.password, confirm: true },
      }),
    );
    expect(withdraw.status).toBe(200);

    const user = await db.user.findUniqueOrThrow({
      where: { loginId: REGISTER_BODY.loginId },
    });
    expect(user.status).toBe("WITHDRAWN");

    const { response } = await login(REGISTER_BODY.loginId, REGISTER_BODY.password);
    expect(response.status).toBe(401);
  });

  test("FM-003 회원 정보 수정: 비로그인 요청은 401", async () => {
    const response = await profileRoute(
      makeRequest("PATCH", "/api/account/profile", {
        body: { name: "가상회원2", email: "x@example.test", phone: "010-3333-4444" },
      }),
    );
    expect(response.status).toBe(401);
  });

  test("FM-003 아이디 찾기: 계정이 있든 없든 같은 202 응답을 준다", async () => {
    await register();

    const existing = await findLoginIdRoute(
      makeRequest("POST", "/api/auth/find-login-id", {
        body: { name: REGISTER_BODY.name, email: REGISTER_BODY.email },
      }),
    );
    const missing = await findLoginIdRoute(
      makeRequest("POST", "/api/auth/find-login-id", {
        body: { name: "없는사람", email: "missing@example.test" },
      }),
    );

    expect(existing.status).toBe(202);
    expect(missing.status).toBe(202);
    expect(await existing.json()).toEqual(await missing.json());
    expect(getMemoryMailAdapter().sent()).toHaveLength(1);
  });

  test("FM-003 비밀번호 재설정 요청: 계정이 없어도 같은 202 응답을 준다", async () => {
    await register();

    const existing = await resetRequestRoute(
      makeRequest("POST", "/api/auth/password-reset/request", {
        body: { loginId: REGISTER_BODY.loginId, email: REGISTER_BODY.email },
      }),
    );
    const missing = await resetRequestRoute(
      makeRequest("POST", "/api/auth/password-reset/request", {
        body: { loginId: "nouser", email: "missing@example.test" },
      }),
    );

    expect(existing.status).toBe(202);
    expect(missing.status).toBe(202);
    expect(await existing.json()).toEqual(await missing.json());
    expect(await db.passwordResetToken.count()).toBe(1);
  });

  test("FM-003 비밀번호 재설정: 토큰은 한 번만 쓸 수 있고 기존 세션을 끊는다", async () => {
    await register();
    const { cookie } = await login(REGISTER_BODY.loginId, REGISTER_BODY.password);

    await resetRequestRoute(
      makeRequest("POST", "/api/auth/password-reset/request", {
        body: { loginId: REGISTER_BODY.loginId, email: REGISTER_BODY.email },
      }),
    );
    const token = resetTokenFromMail();

    const confirm = await resetConfirmRoute(
      makeRequest("POST", "/api/auth/password-reset/confirm", {
        body: {
          token,
          password: fixturePassword("new-0003"),
          passwordConfirm: fixturePassword("new-0003"),
        },
      }),
    );
    expect(confirm.status).toBe(200);
    expect(await db.authSession.count()).toBe(0);

    const stale = await profileRoute(
      makeRequest("PATCH", "/api/account/profile", {
        cookie,
        body: { name: "가상회원2", email: "x@example.test", phone: "010-3333-4444" },
      }),
    );
    expect(stale.status).toBe(401);

    const reuse = await resetConfirmRoute(
      makeRequest("POST", "/api/auth/password-reset/confirm", {
        body: {
          token,
          password: fixturePassword("new-0004"),
          passwordConfirm: fixturePassword("new-0004"),
        },
      }),
    );
    expect(reuse.status).toBe(400);
    expect((await reuse.json()).code).toBe("TOKEN_INVALID");

    const relogin = await login(REGISTER_BODY.loginId, fixturePassword("new-0003"));
    expect(relogin.response.status).toBe(200);
  });

  test("FM-003 비밀번호 재설정: 만료된 토큰은 400 TOKEN_INVALID", async () => {
    const response = await register();
    expect(response.status).toBe(201);
    const user = await db.user.findUniqueOrThrow({
      where: { loginId: REGISTER_BODY.loginId },
    });

    const expiredToken = "expired-fake-token-0000000000";
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(expiredToken),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const confirm = await resetConfirmRoute(
      makeRequest("POST", "/api/auth/password-reset/confirm", {
        body: {
          token: expiredToken,
          password: fixturePassword("new-0005"),
          passwordConfirm: fixturePassword("new-0005"),
        },
      }),
    );
    expect(confirm.status).toBe(400);
    expect((await confirm.json()).code).toBe("TOKEN_INVALID");
  });

  test("FM-003 로그인 시도 제한: 상한을 넘기면 429 RATE_LIMITED", async () => {
    await register();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await login(REGISTER_BODY.loginId, fixturePassword("wrong-0001"));
      expect(failed.response.status).toBe(401);
    }

    const limited = await login(REGISTER_BODY.loginId, REGISTER_BODY.password);
    expect(limited.response.status).toBe(429);
    expect((await limited.response.json()).code).toBe("RATE_LIMITED");
    expect(cookiesFrom(limited.response)).toBe("");
  });

  test("FM-003 로그인 시도 제한: 기록은 DB에 남아 재시작 후에도 유지된다", async () => {
    await register();
    await login(REGISTER_BODY.loginId, fixturePassword("wrong-0001"));

    const attempts = await db.loginAttempt.findMany();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].succeeded).toBe(false);
    // 식별자 원문은 저장하지 않는다.
    expect(attempts[0].identifierHash).not.toContain(REGISTER_BODY.loginId);
  });
});

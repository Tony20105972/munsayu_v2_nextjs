"use server";

import type { ActionResult } from "@/lib/action-result";
import {
  changePasswordSchema,
  findLoginIdSchema,
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  updateProfileSchema,
  withdrawSchema,
  type SessionUser,
} from "@/lib/contracts";
import {
  destroySessionAndCookie,
  enforcePublicRateLimit,
  failure,
  parseInput,
  success,
  toFailure,
  writeSessionCookie,
} from "@/lib/actions/internal";
import { issueSession, toSessionUser } from "@/server/auth/session";
import { requireMemberFromCookies } from "@/server/auth/server-component-session";
import {
  authenticate,
  changePassword,
  confirmPasswordReset,
  registerMember,
  requestPasswordReset,
  sendLoginIdByMail,
  updateProfile,
  withdrawMember,
} from "@/server/services/accounts";

/**
 * FM-003 회원 lifecycle 과 AD-001 관리자 로그인의 Server Action.
 *
 * 세션 쿠키는 회원용·관리자용이 완전히 분리돼 있다. 회원 쿠키로는 관리자 화면에
 * 들어갈 수 없다. (BLUEPRINT 7장)
 */

/** 계정이 있는지 여부를 응답으로 알려 주지 않는 공통 문구. */
const NEUTRAL_ACCOUNT_MESSAGE =
  "입력하신 정보로 확인할 수 있는 계정이 있으면 안내 메일을 보냈습니다. 메일함을 확인해 주세요.";

/**
 * PG-014 회원가입. 가입과 동시에 회원 세션을 발급한다.
 * `POST /api/auth/register` 와 같은 동작이어야 한다(openapi: 201 가입 및 세션 생성).
 */
export async function registerAction(
  input: unknown,
): Promise<ActionResult<SessionUser>> {
  try {
    await enforcePublicRateLimit("action-register");
    const parsed = parseInput(registerSchema, input);
    if (!parsed.ok) return parsed.failure;

    const user = await registerMember(parsed.value);
    const session = await issueSession(user.id, "MEMBER", false);
    await writeSessionCookie("MEMBER", session.token, session.cookieMaxAgeSeconds);

    return success(toSessionUser(user));
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * PG-013 회원 로그인. 역할에 맞는 쿠키를 발급한다.
 * 관리자 계정으로 이 화면에서 로그인하면 관리자 쿠키가 나간다. (BE 로그인 경로와 같은 규칙)
 */
export async function loginAction(input: unknown): Promise<ActionResult<SessionUser>> {
  try {
    await enforcePublicRateLimit("action-login");
    const parsed = parseInput(loginSchema, input);
    if (!parsed.ok) return parsed.failure;

    const user = await authenticate(parsed.value);
    const scope = user.role === "ADMIN" ? "ADMIN" : "MEMBER";
    const session = await issueSession(user.id, scope, parsed.value.rememberMe);
    await writeSessionCookie(scope, session.token, session.cookieMaxAgeSeconds);

    return success(toSessionUser(user));
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * AD-001 관리자 로그인. 관리자 역할이 아니면 쿠키를 만들지 않는다.
 * 회원 계정으로는 이 화면을 통과할 수 없다.
 */
export async function adminLoginAction(
  input: unknown,
): Promise<ActionResult<SessionUser>> {
  try {
    await enforcePublicRateLimit("action-admin-login");
    const parsed = parseInput(loginSchema, input);
    if (!parsed.ok) return parsed.failure;

    const user = await authenticate(parsed.value);
    if (user.role !== "ADMIN") {
      return failure("관리자 계정이 아닙니다.");
    }

    const session = await issueSession(user.id, "ADMIN", parsed.value.rememberMe);
    await writeSessionCookie("ADMIN", session.token, session.cookieMaxAgeSeconds);

    return success(toSessionUser(user));
  } catch (error) {
    return toFailure(error);
  }
}

/** FM-003 / AD-001 로그아웃. 회원·관리자 두 범위의 세션과 쿠키를 모두 지운다. */
export async function logoutAction(): Promise<ActionResult> {
  try {
    await destroySessionAndCookie("MEMBER");
    await destroySessionAndCookie("ADMIN");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/** FM-003 아이디 찾기. 계정이 없어도 같은 문구로 답한다. */
export async function findLoginIdAction(input: unknown): Promise<ActionResult<string>> {
  try {
    await enforcePublicRateLimit("action-find-login-id");
    const parsed = parseInput(findLoginIdSchema, input);
    if (!parsed.ok) return parsed.failure;

    await sendLoginIdByMail(parsed.value);
    return success(NEUTRAL_ACCOUNT_MESSAGE);
  } catch (error) {
    return toFailure(error);
  }
}

/** FM-003 비밀번호 재설정 요청. 계정이 없어도 같은 문구로 답한다. */
export async function requestPasswordResetAction(
  input: unknown,
): Promise<ActionResult<string>> {
  try {
    await enforcePublicRateLimit("action-password-reset-request");
    const parsed = parseInput(requestPasswordResetSchema, input);
    if (!parsed.ok) return parsed.failure;

    await requestPasswordReset(parsed.value);
    return success(NEUTRAL_ACCOUNT_MESSAGE);
  } catch (error) {
    return toFailure(error);
  }
}

/** FM-003 비밀번호 재설정 확정. 토큰은 1회용이다. */
export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    await enforcePublicRateLimit("action-password-reset-confirm");
    const parsed = parseInput(resetPasswordSchema, input);
    if (!parsed.ok) return parsed.failure;

    await confirmPasswordReset(parsed.value);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/** FM-003 회원 정보 수정. 세션은 서버에서 다시 확인한다. */
export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const member = await requireMemberFromCookies();
    const parsed = parseInput(updateProfileSchema, input);
    if (!parsed.ok) return parsed.failure;

    await updateProfile(member.id, parsed.value);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/** FM-003 비밀번호 변경. 바꾸고 나면 기존 세션이 모두 끊기므로 쿠키도 지운다. */
export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const member = await requireMemberFromCookies();
    const parsed = parseInput(changePasswordSchema, input);
    if (!parsed.ok) return parsed.failure;

    await changePassword(member.id, parsed.value);
    await destroySessionAndCookie("MEMBER");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/** FM-003 탈퇴. 기록은 지우지 않고 상태만 바꾼다. (BLUEPRINT 6장) */
export async function withdrawAction(input: unknown): Promise<ActionResult> {
  try {
    const member = await requireMemberFromCookies();
    const parsed = parseInput(withdrawSchema, input);
    if (!parsed.ok) return parsed.failure;

    await withdrawMember(member.id, parsed.value);
    await destroySessionAndCookie("MEMBER");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

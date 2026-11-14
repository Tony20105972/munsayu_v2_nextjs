import "server-only";
import type { User } from "@prisma/client";
import {
  PASSWORD_RESET_TOKEN_TTL_MINUTES,
  type ChangePasswordInput,
  type FindLoginIdInput,
  type LoginInput,
  type RegisterInput,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
  type WithdrawInput,
} from "@/lib/contracts";
import { db } from "@/server/db";
import { envValue } from "@/server/env";
import { conflict, tokenInvalid, unauthenticated } from "@/server/errors";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { invalidateUserSessions } from "@/server/auth/session";
import { assertLoginAllowed, recordLoginAttempt } from "@/server/auth/throttle";
import { createToken, hashToken } from "@/server/auth/tokens";
import { getMailAdapter } from "@/server/adapters/mail";

function appBaseUrl(): string {
  // 배포 주소는 환경 변수로 받는다. 없으면 로컬 기본값을 쓴다. // ASM-023
  return envValue("APP_BASE_URL") ?? "http://localhost:3000";
}

/** FM-003 회원가입. 아이디·이메일 중복은 409로 막는다. */
export async function registerMember(input: RegisterInput): Promise<User> {
  const duplicate = await db.user.findFirst({
    where: { OR: [{ loginId: input.loginId }, { email: input.email }] },
    select: { id: true },
  });
  if (duplicate) throw conflict("이미 사용 중인 아이디 또는 이메일입니다.");

  return db.user.create({
    data: {
      loginId: input.loginId,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: "MEMBER",
    },
  });
}

/**
 * FM-003 / AD-001 로그인 자격 확인.
 * 차단(BLOCKED)·탈퇴(WITHDRAWN) 계정은 로그인할 수 없다.
 * 실패 사유를 구분해서 알려 주지 않는다. (계정 존재 여부 비노출)
 */
export async function authenticate(input: LoginInput): Promise<User> {
  const user = await db.user.findUnique({ where: { loginId: input.loginId } });
  const scope = user?.role === "ADMIN" ? "ADMIN" : "MEMBER";

  await assertLoginAllowed(input.loginId, scope);

  if (!user || user.status !== "ACTIVE") {
    await recordLoginAttempt(input.loginId, scope, false);
    throw unauthenticated();
  }

  const passwordMatches = await verifyPassword(user.passwordHash, input.password);
  if (!passwordMatches) {
    await recordLoginAttempt(input.loginId, scope, false);
    throw unauthenticated();
  }

  await recordLoginAttempt(input.loginId, scope, true);
  return user;
}

/**
 * FM-003 아이디 찾기. 계정이 있든 없든 같은 응답을 주고 결과는 메일로만 보낸다.
 * (ASM-010, openapi 202)
 */
export async function sendLoginIdByMail(input: FindLoginIdInput): Promise<void> {
  const user = await db.user.findFirst({
    where: { name: input.name, email: input.email, status: { not: "WITHDRAWN" } },
    select: { loginId: true, email: true },
  });
  if (!user) return;

  await getMailAdapter().send({
    to: user.email,
    subject: "[문사유] 아이디 찾기 안내",
    text: `요청하신 아이디는 ${user.loginId} 입니다.`,
  });
}

/**
 * FM-003 비밀번호 재설정 요청. 1회용·만료 토큰을 메일로만 보낸다.
 * 계정이 없어도 같은 응답을 준다.
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<void> {
  const user = await db.user.findFirst({
    where: {
      loginId: input.loginId,
      email: input.email,
      status: { not: "WITHDRAWN" },
    },
    select: { id: true, email: true },
  });
  if (!user) return;

  const token = createToken();
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000),
    },
  });

  // 실제 재설정 화면 경로다. 화면 경로와 다르면 메일 링크가 404 가 된다. (C-3 통합에서 확인)
  const link = `${appBaseUrl()}/account/password-reset?token=${token}`;
  await getMailAdapter().send({
    to: user.email,
    subject: "[문사유] 비밀번호 재설정 안내",
    text: [
      `아래 링크에서 비밀번호를 다시 설정해 주세요.`,
      link,
      `이 링크는 ${PASSWORD_RESET_TOKEN_TTL_MINUTES}분 동안 한 번만 쓸 수 있습니다.`,
    ].join("\n"),
  });
}

/**
 * FM-003 비밀번호 재설정 확정. 토큰은 1회용이고 만료되면 쓸 수 없다.
 * 성공하면 기존 세션을 모두 끊는다.
 */
export async function confirmPasswordReset(input: ResetPasswordInput): Promise<void> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw tokenInvalid();
  }

  const passwordHash = await hashPassword(input.password);

  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await invalidateUserSessions(record.userId, tx);
  });
}

/**
 * FM-003 회원 정보 수정 화면이 현재 값을 미리 채우기 위해 쓴다.
 * 비밀번호 해시 같은 값은 돌려주지 않는다.
 */
export async function getMemberProfile(
  userId: string,
): Promise<{ name: string; email: string; phone: string } | null> {
  return db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true },
  });
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<User> {
  const duplicate = await db.user.findFirst({
    where: { email: input.email, id: { not: userId } },
    select: { id: true },
  });
  if (duplicate) throw conflict("이미 사용 중인 이메일입니다.");

  return db.user.update({
    where: { id: userId },
    data: { name: input.name, email: input.email, phone: input.phone },
  });
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw unauthenticated();

  const matches = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!matches) throw unauthenticated();

  const passwordHash = await hashPassword(input.password);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await invalidateUserSessions(userId, tx);
  });
}

/** FM-003 탈퇴. 행을 지우지 않고 상태만 WITHDRAWN으로 바꾼다. (BLUEPRINT 6장) */
export async function withdrawMember(
  userId: string,
  input: WithdrawInput,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw unauthenticated();

  const matches = await verifyPassword(user.passwordHash, input.password);
  if (!matches) throw unauthenticated();

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    });
    await invalidateUserSessions(userId, tx);
  });
}

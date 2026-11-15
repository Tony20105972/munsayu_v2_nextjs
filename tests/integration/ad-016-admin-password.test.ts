import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { changePasswordSchema } from "@/lib/contracts";
import { changePassword } from "@/server/services/accounts";
import { resetAdminPassword } from "@/server/services/members";
import { AppError } from "@/server/errors";
import { GET as membersGet } from "../../app/api/admin/members/route";
import {
  FAKE,
  createAdminUser,
  createMemberUser,
  login,
  makeRequest,
  resetDatabase,
} from "./helpers";
import { fixturePassword } from "../fixtures/passwords";

/**
 * AD-016 관리자 비밀번호 바꾸기·초기화.
 *
 * 여기서 지키려는 것은 셋이다.
 * 1. 현재 비밀번호를 모르면 바꿀 수 없다.
 * 2. 바꾸면 **옛 세션이 끊긴다.** 비밀번호를 바꾸는 이유가 「누가 들어왔을지도 모른다」
 *    일 수 있어서, 남은 세션을 살려 두면 바꾼 의미가 없다.
 * 3. 임시 비밀번호로 들어온 관리자는 **비밀번호를 바꾸기 전까지 아무 일도 못 한다.**
 *    화면을 가리는 것만으로는 Server Action·API 를 직접 부르는 길이 열려 있다.
 */

const NEW_PASSWORD = fixturePassword("admin-new-0001");

beforeEach(async () => {
  await resetDatabase();
});

async function adminWithCookie(loginId: string, password: string) {
  const user = await createAdminUser(loginId, password);
  const { cookie } = await login(loginId, password);
  return { id: user.id, cookie };
}

describe("AD-016 본인 비밀번호 바꾸기", () => {
  test("현재 비밀번호가 틀리면 바뀌지 않는다", async () => {
    const admin = await adminWithCookie(FAKE.adminLoginId, FAKE.adminPassword);
    const before = await db.user.findUniqueOrThrow({
      where: { id: admin.id },
      select: { passwordHash: true },
    });

    /*
     * 401 이 아니라 422(칸 오류)다. 이미 로그인한 사람이고 틀린 것은 입력이다.
     * 401 이면 화면이 「로그인이 필요합니다」를 띄워 사람이 세션이 끊긴 줄 안다.
     */
    await expect(
      changePassword(admin.id, {
        currentPassword: fixturePassword("wrong-0001"),
        password: NEW_PASSWORD,
        passwordConfirm: NEW_PASSWORD,
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { currentPassword: ["현재 비밀번호가 맞지 않습니다."] },
    });

    const after = await db.user.findUniqueOrThrow({
      where: { id: admin.id },
      select: { passwordHash: true },
    });
    expect(after.passwordHash).toBe(before.passwordHash);
    // 실패는 기록을 남기지 않는다. 남기면 틀린 시도로 기록이 가득 찬다.
    expect(await db.auditLog.count({ where: { action: "PASSWORD_CHANGE" } })).toBe(0);
  });

  test("새 비밀번호가 서로 다르면 계약이 거절한다", () => {
    const parsed = changePasswordSchema.safeParse({
      currentPassword: FAKE.adminPassword,
      password: NEW_PASSWORD,
      passwordConfirm: `${NEW_PASSWORD}x`,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toContain(
        "passwordConfirm",
      );
    }
  });

  test("새 비밀번호가 정책에 못 미치면 계약이 거절한다", () => {
    for (const weak of ["short1", "onlyletters", "1234567890"]) {
      const parsed = changePasswordSchema.safeParse({
        currentPassword: FAKE.adminPassword,
        password: weak,
        passwordConfirm: weak,
      });
      expect(parsed.success, `${weak} 가 통과했다`).toBe(false);
    }
  });

  test("바꾸면 옛 세션이 끊기고 감사 기록이 남는다", async () => {
    const admin = await adminWithCookie(FAKE.adminLoginId, FAKE.adminPassword);

    // 바꾸기 전에는 관리자 API 가 열린다.
    const before = await membersGet(
      makeRequest("GET", "/api/admin/members", { cookie: admin.cookie }),
    );
    expect(before.status).toBe(200);

    await changePassword(admin.id, {
      currentPassword: FAKE.adminPassword,
      password: NEW_PASSWORD,
      passwordConfirm: NEW_PASSWORD,
    });

    // 같은 쿠키로는 더 이상 통하지 않는다. 세션 행이 지워졌다.
    const after = await membersGet(
      makeRequest("GET", "/api/admin/members", { cookie: admin.cookie }),
    );
    expect(after.status).toBe(401);

    expect(await db.authSession.count({ where: { userId: admin.id } })).toBe(0);

    const log = await db.auditLog.findFirstOrThrow({
      where: { action: "PASSWORD_CHANGE" },
    });
    expect(log.actorUserId).toBe(admin.id);
    expect(log.resourceId).toBe(admin.id);
    // 비밀번호 값은 어디에도 남지 않는다.
    expect(JSON.stringify(log)).not.toContain(NEW_PASSWORD);
  });

  test("바꾼 뒤에는 새 비밀번호로만 로그인된다", async () => {
    const admin = await adminWithCookie(FAKE.adminLoginId, FAKE.adminPassword);
    await changePassword(admin.id, {
      currentPassword: FAKE.adminPassword,
      password: NEW_PASSWORD,
      passwordConfirm: NEW_PASSWORD,
    });

    const old = await login(FAKE.adminLoginId, FAKE.adminPassword);
    expect(old.response.status).toBe(401);

    const fresh = await login(FAKE.adminLoginId, NEW_PASSWORD);
    expect(fresh.response.status).toBe(200);
  });
});

describe("AD-016 다른 관리자 비밀번호 초기화", () => {
  test("임시 비밀번호를 한 번 돌려주고, 대상 세션을 끊고, 변경을 강제한다", async () => {
    const actor = await adminWithCookie(FAKE.adminLoginId, FAKE.adminPassword);
    const target = await adminWithCookie("targetadmin", fixturePassword("admin-0002"));

    const issued = await resetAdminPassword(actor.id, { userId: target.id });

    expect(issued.loginId).toBe("targetadmin");
    expect(issued.temporaryPassword).toHaveLength(24);
    // 임시 비밀번호도 로그인 규칙을 만족해야 한다. 아니면 바꿀 수 없는 계정이 된다.
    expect(issued.temporaryPassword).toMatch(/[A-Za-z]/);
    expect(issued.temporaryPassword).toMatch(/[0-9]/);

    const row = await db.user.findUniqueOrThrow({
      where: { id: target.id },
      select: { mustChangePassword: true, passwordHash: true },
    });
    expect(row.mustChangePassword).toBe(true);
    // 저장된 값은 해시다. 임시 비밀번호 원문은 DB 에 없다.
    expect(row.passwordHash).not.toContain(issued.temporaryPassword);

    expect(await db.authSession.count({ where: { userId: target.id } })).toBe(0);
    // 초기화한 사람의 세션은 멀쩡하다.
    expect(await db.authSession.count({ where: { userId: actor.id } })).toBe(1);

    const log = await db.auditLog.findFirstOrThrow({
      where: { action: "ADMIN_PASSWORD_RESET" },
    });
    expect(log.actorUserId).toBe(actor.id);
    expect(log.resourceId).toBe(target.id);
    expect(JSON.stringify(log)).not.toContain(issued.temporaryPassword);

    // 임시 비밀번호로 로그인은 된다. 막는 것은 그다음이다.
    const relogin = await login("targetadmin", issued.temporaryPassword);
    expect(relogin.response.status).toBe(200);
  });

  test("자기 계정은 초기화할 수 없다", async () => {
    const actor = await adminWithCookie(FAKE.adminLoginId, FAKE.adminPassword);

    await expect(
      resetAdminPassword(actor.id, { userId: actor.id }),
    ).rejects.toMatchObject({ status: 403 });

    const row = await db.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { mustChangePassword: true },
    });
    expect(row.mustChangePassword).toBe(false);
  });

  test("관리자가 아닌 계정은 404 다", async () => {
    const actor = await adminWithCookie(FAKE.adminLoginId, FAKE.adminPassword);
    const member = await createMemberUser("plainmember");

    await expect(
      resetAdminPassword(actor.id, { userId: member.id }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("AD-016 변경 강제", () => {
  test("임시 비밀번호 상태에서는 관리자 API 가 403 으로 막는다", async () => {
    const admin = await adminWithCookie(FAKE.adminLoginId, FAKE.adminPassword);
    await db.user.update({
      where: { id: admin.id },
      data: { mustChangePassword: true },
    });

    const response = await membersGet(
      makeRequest("GET", "/api/admin/members", { cookie: admin.cookie }),
    );
    expect(response.status).toBe(403);
    const body = await response.text();
    expect(body).toContain("비밀번호를 먼저 바꿔");
  });

  test("비밀번호를 바꾸면 강제 깃발이 꺼진다", async () => {
    const admin = await adminWithCookie(FAKE.adminLoginId, FAKE.adminPassword);
    await db.user.update({
      where: { id: admin.id },
      data: { mustChangePassword: true },
    });

    await changePassword(admin.id, {
      currentPassword: FAKE.adminPassword,
      password: NEW_PASSWORD,
      passwordConfirm: NEW_PASSWORD,
    });

    const row = await db.user.findUniqueOrThrow({
      where: { id: admin.id },
      select: { mustChangePassword: true },
    });
    expect(row.mustChangePassword).toBe(false);

    // 다시 로그인하면 관리자 API 가 열린다.
    const { cookie } = await login(FAKE.adminLoginId, NEW_PASSWORD);
    const response = await membersGet(
      makeRequest("GET", "/api/admin/members", { cookie }),
    );
    expect(response.status).toBe(200);
  });

  test("강제 상태를 막는 것은 403 이고 401 이 아니다 (로그인은 유효하다)", async () => {
    const admin = await adminWithCookie(FAKE.adminLoginId, FAKE.adminPassword);
    await db.user.update({
      where: { id: admin.id },
      data: { mustChangePassword: true },
    });

    const { requireAdmin } = await import("@/server/auth/guards");
    const request = makeRequest("GET", "/api/admin/members", { cookie: admin.cookie });

    await expect(requireAdmin(request)).rejects.toBeInstanceOf(AppError);
    await expect(requireAdmin(request)).rejects.toMatchObject({ status: 403 });

    // 비밀번호를 바꾸는 경로만 통과한다.
    const allowed = await requireAdmin(request, { allowPasswordChangePending: true });
    expect(allowed.id).toBe(admin.id);
  });
});

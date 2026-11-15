import "server-only";
import type { AccountStatus, UserRole } from "@prisma/client";
import {
  maskName,
  maskPhone,
  type AdminAccountCreateInput,
  type AdminAccountDeleteInput,
  type AdminPasswordResetInput,
  type MemberSearchInput,
  type MemberStatusChangeInput,
} from "@/lib/contracts";
import { db } from "@/server/db";
import { conflict, forbidden, notFound } from "@/server/errors";
import { generateTemporaryPassword, hashPassword } from "@/server/auth/password";
import { invalidateUserSessions } from "@/server/auth/session";
import { writeAuditLog } from "@/server/services/audit";

/** 관리자 목록에서 쓰는 이메일 마스킹. 도메인은 남기고 계정 부분만 가린다. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

export type MemberRow = {
  id: string;
  loginId: string;
  maskedName: string;
  maskedEmail: string;
  maskedPhone: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
};

export type MemberList = {
  items: MemberRow[];
  total: number;
  page: number;
  pageSize: number;
};

/** AD-002 회원 검색. 목록에는 가린 값만 담는다. (BLUEPRINT 10장) */
export async function searchMembers(input: MemberSearchInput): Promise<MemberList> {
  const keyword = input.keyword?.trim();
  const where = {
    ...(input.status ? { status: input.status } : {}),
    ...(keyword
      ? {
          OR: [
            { loginId: { contains: keyword, mode: "insensitive" as const } },
            { name: { contains: keyword, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  return {
    total,
    page: input.page,
    pageSize: input.pageSize,
    items: users.map((user) => ({
      id: user.id,
      loginId: user.loginId,
      maskedName: maskName(user.name),
      maskedEmail: maskEmail(user.email),
      maskedPhone: maskPhone(user.phone),
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    })),
  };
}

/** AD-002 상태 변경(ACTIVE / BLOCKED / WITHDRAWN). 기록을 남긴다. */
export async function changeMemberStatus(
  actorUserId: string,
  input: MemberStatusChangeInput,
): Promise<{ id: string; status: AccountStatus }> {
  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  });
  if (!target) throw notFound();

  const updated = await db.user.update({
    where: { id: input.userId },
    data: {
      status: input.status,
      withdrawnAt: input.status === "WITHDRAWN" ? new Date() : null,
    },
    select: { id: true, status: true },
  });

  if (input.status !== "ACTIVE") {
    await invalidateUserSessions(input.userId);
  }

  await writeAuditLog({
    actorUserId,
    action: "MEMBER_STATUS_CHANGE",
    resourceType: "User",
    resourceId: updated.id,
    filterSummary: `status=${updated.status}`,
  });

  return updated;
}

/** AD-002 관리자 계정 추가. 역할 구분은 없고 단일 ADMIN이다. (D5, Q-ADM-10) */
export async function createAdminAccount(
  actorUserId: string,
  input: AdminAccountCreateInput,
): Promise<{ id: string; loginId: string }> {
  const duplicate = await db.user.findFirst({
    where: { OR: [{ loginId: input.loginId }, { email: input.email }] },
    select: { id: true },
  });
  if (duplicate) throw conflict("이미 사용 중인 아이디 또는 이메일입니다.");

  const created = await db.user.create({
    data: {
      loginId: input.loginId,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: "ADMIN",
    },
    select: { id: true, loginId: true },
  });

  await writeAuditLog({
    actorUserId,
    action: "ADMIN_ACCOUNT_CREATE",
    resourceType: "User",
    resourceId: created.id,
  });

  return created;
}

/**
 * AD-002 관리자 계정 삭제.
 * 관리자가 한 명도 남지 않는 상태를 만들 수 없으므로 마지막 관리자는 409로 막는다.
 * 자기 계정 삭제는 실수 방지를 위해 403으로 막는다.
 */
export async function deleteAdminAccount(
  actorUserId: string,
  input: AdminAccountDeleteInput,
): Promise<void> {
  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true },
  });
  if (!target || target.role !== "ADMIN") throw notFound();

  const remainingAdmins = await db.user.count({ where: { role: "ADMIN" } });
  if (remainingAdmins <= 1) {
    throw conflict("마지막 관리자 계정은 삭제할 수 없습니다.");
  }

  if (actorUserId === input.userId) {
    throw forbidden();
  }

  await db.user.delete({ where: { id: input.userId } });

  await writeAuditLog({
    actorUserId,
    action: "ADMIN_ACCOUNT_DELETE",
    resourceType: "User",
    resourceId: input.userId,
  });
}

/**
 * AD-016 다른 관리자의 비밀번호 초기화.
 *
 * 비밀번호를 잊은 관리자를 되살리는 길이다. 메일 재설정 경로(FM-003)는 메일 업체가
 * 정해지기 전까지 동작하지 않으므로(D4), 관리자가 손으로 풀어 줄 수 있어야 한다.
 *
 * 규칙
 * - **새 비밀번호를 받지 않는다.** 서버가 임시 비밀번호를 만들어 **한 번만** 돌려준다.
 *   저장하지도, 기록에 남기지도 않는다.
 * - 대상 계정의 **모든 세션을 끊는다.** 이미 누가 그 계정으로 들어와 있을 수 있다.
 * - 대상 계정에 **변경 강제 깃발을 켠다.** 다음 로그인 때 비밀번호를 바꿔야 한다.
 * - **자기 계정은 막는다**(403). 자기 비밀번호는 「비밀번호 바꾸기」로 바꾼다. 여기서
 *   하면 지금 쓰는 세션이 끊기면서 임시 비밀번호만 남아 혼란스럽다.
 * - 관리자가 아닌 계정은 404. 회원 계정은 이 화면에서 다루지 않는다.
 */
export async function resetAdminPassword(
  actorUserId: string,
  input: AdminPasswordResetInput,
): Promise<{ loginId: string; temporaryPassword: string }> {
  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, loginId: true, role: true },
  });
  if (!target || target.role !== "ADMIN") throw notFound();

  if (actorUserId === input.userId) {
    throw forbidden();
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { passwordHash, mustChangePassword: true },
    });
    await invalidateUserSessions(target.id, tx);
    await writeAuditLog(
      {
        actorUserId,
        action: "ADMIN_PASSWORD_RESET",
        resourceType: "User",
        resourceId: target.id,
      },
      tx,
    );
  });

  return { loginId: target.loginId, temporaryPassword };
}

/** 관리자 화면의 회원 요약 숫자. 개인정보는 담지 않는다. */
export async function memberCountsByStatus(): Promise<Record<AccountStatus, number>> {
  const grouped = await db.user.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<AccountStatus, number> = {
    ACTIVE: 0,
    BLOCKED: 0,
    WITHDRAWN: 0,
  };
  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }
  return counts;
}

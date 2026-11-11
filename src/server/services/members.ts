import "@/server/server-only";
import type { AccountStatus, UserRole } from "@prisma/client";
import {
  maskName,
  maskPhone,
  type AdminAccountCreateInput,
  type AdminAccountDeleteInput,
  type MemberSearchInput,
  type MemberStatusChangeInput,
} from "@/lib/contracts";
import { db } from "@/server/db";
import { conflict, forbidden, notFound } from "@/server/errors";
import { hashPassword } from "@/server/auth/password";
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

export async function deleteAdminAccount(
  actorUserId: string,
  input: AdminAccountDeleteInput,
): Promise<void> {
  if (actorUserId === input.userId) {
    throw forbidden();
  }

  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true },
  });
  if (!target || target.role !== "ADMIN") throw notFound();

  await db.user.delete({ where: { id: input.userId } });

  await writeAuditLog({
    actorUserId,
    action: "ADMIN_ACCOUNT_DELETE",
    resourceType: "User",
    resourceId: input.userId,
  });
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

import "@/server/server-only";
import type { AuditAction, Prisma } from "@prisma/client";
import { db } from "@/server/db";

export type AuditEntry = {
  actorUserId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  /** 건수와 필터 이름만 담는다. 이름·연락처·검색어는 절대 넣지 않는다. (AD-013) */
  filterSummary?: string | null;
};

/** 감사기록을 남기는 단일 지점. */
export async function writeAuditLog(
  entry: AuditEntry,
  client: Prisma.TransactionClient | typeof db = db,
): Promise<{ id: string }> {
  return client.auditLog.create({
    data: {
      actorUserId: entry.actorUserId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      filterSummary: entry.filterSummary ?? null,
    },
    select: { id: true },
  });
}

/**
 * 필터 요약 문자열을 만든다. 값이 들어 있는 필터의 **이름**과 건수만 담는다.
 * 검색어·이름·연락처 같은 값은 담지 않는다. (AD-013, BLUEPRINT 10장)
 */
export function summarizeFilter(
  filter: Record<string, unknown>,
  count: number,
): string {
  const names = Object.entries(filter)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key]) => key)
    .sort();
  return `filters=${names.join(",")};count=${count}`;
}

import "@/server/server-only";
import { db } from "@/server/db";
import { notFound } from "@/server/errors";

export type NoticeSummary = {
  id: string;
  title: string;
  isPinned: boolean;
  publishedAt: string | null;
};

export type NoticeDetail = NoticeSummary & { body: string };

/** PG-012 공지 공개 목록. 게시 시각이 지난 글만 보여 준다. (ASM-015) */
export async function listNotices(now: Date = new Date()): Promise<NoticeSummary[]> {
  const notices = await db.notice.findMany({
    where: { publishedAt: { not: null, lte: now } },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
  });

  return notices.map((notice) => ({
    id: notice.id,
    title: notice.title,
    isPinned: notice.isPinned,
    publishedAt: notice.publishedAt?.toISOString() ?? null,
  }));
}

export async function getNotice(
  noticeId: string,
  now: Date = new Date(),
): Promise<NoticeDetail> {
  const notice = await db.notice.findFirst({
    where: { id: noticeId, publishedAt: { not: null, lte: now } },
  });
  if (!notice) throw notFound();

  return {
    id: notice.id,
    title: notice.title,
    isPinned: notice.isPinned,
    publishedAt: notice.publishedAt?.toISOString() ?? null,
    body: notice.body,
  };
}

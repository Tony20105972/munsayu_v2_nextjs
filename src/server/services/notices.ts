import "server-only";
import { db } from "@/server/db";
import { notFound } from "@/server/errors";

export type NoticeSummary = {
  id: string;
  title: string;
  isPinned: boolean;
  publishedAt: string | null;
};

export type NoticeDetail = NoticeSummary & { body: string };

export type NoticeList = {
  items: NoticeSummary[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * PG-012 공지 공개 목록. 게시 시각이 지난 글만 보여 주고 고정 글을 먼저 보여 준다. (ASM-015)
 * 목록이 길어질 수 있어 페이지 단위로 돌려준다.
 */
export async function listNotices(
  options: { page?: number; pageSize?: number; now?: Date } = {},
): Promise<NoticeList> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const where = { publishedAt: { not: null, lte: options.now ?? new Date() } };

  const [total, notices] = await Promise.all([
    db.notice.count({ where }),
    db.notice.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    items: notices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      isPinned: notice.isPinned,
      publishedAt: notice.publishedAt?.toISOString() ?? null,
    })),
  };
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

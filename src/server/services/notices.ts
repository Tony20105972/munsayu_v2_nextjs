import "server-only";
import { db } from "@/server/db";
import { notFound } from "@/server/errors";
import { sanitizeNoticeHtml } from "@/server/lib/sanitize-notice-html";

export type NoticeSummary = {
  id: string;
  title: string;
  isPinned: boolean;
  publishedAt: string | null;
  /** 레거시 글 번호. 가져온 글에만 있다. 목록의 `번호` 칸에 쓴다. (EV-0007) */
  legacyWrId: number | null;
};

export type NoticeAttachmentView = {
  id: string;
  filename: string;
  sizeBytes: number;
};

export type NoticeDetail = NoticeSummary & {
  /** 이미 허용 목록으로 정리된 HTML 이다. (AD-014) */
  body: string;
  attachments: NoticeAttachmentView[];
};

export type NoticeList = {
  items: NoticeSummary[];
  total: number;
  page: number;
  pageSize: number;
};

/** 레거시 목록은 한 쪽에 15건이었다. (`1 / 15 Page`, EV-0007) */
export const NOTICE_PAGE_SIZE = 15;

/**
 * 공개 화면에 보일 글의 조건.
 * 임시 저장(`DRAFT`)은 절대 보이지 않고, 게시 시각이 아직 오지 않은 글도 숨긴다. (AD-014)
 */
function publicWhere(now: Date) {
  return {
    status: "PUBLISHED" as const,
    publishedAt: { not: null, lte: now },
  };
}

/**
 * PG-012 공지 공개 목록. 고정 글을 먼저 보여 준다.
 * 페이지 크기는 레거시와 같은 15건이다.
 */
export async function listNotices(
  options: { page?: number; pageSize?: number; now?: Date } = {},
): Promise<NoticeList> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? NOTICE_PAGE_SIZE;
  const where = publicWhere(options.now ?? new Date());

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
      legacyWrId: notice.legacyWrId,
    })),
  };
}

/**
 * PG-012 공지 상세.
 *
 * 레거시 상세 주소는 `/bbs/board.php?bo_table=notice&wr_id=N` 이고 308 로 `/notice/N` 이 된다.
 * 그래서 숫자는 **레거시 글 번호**로 먼저 찾고, 없으면 새 글의 id 로 찾는다. (RT-001)
 */
export async function getNotice(
  noticeId: string,
  now: Date = new Date(),
): Promise<NoticeDetail> {
  const where = publicWhere(now);
  const legacyWrId = /^[0-9]+$/.test(noticeId) ? Number.parseInt(noticeId, 10) : null;

  const notice = await db.notice.findFirst({
    where: {
      ...where,
      ...(legacyWrId === null ? { id: noticeId } : { legacyWrId }),
    },
    include: {
      attachments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, filename: true, sizeBytes: true },
      },
    },
  });
  if (!notice) throw notFound();

  return {
    id: notice.id,
    title: notice.title,
    isPinned: notice.isPinned,
    publishedAt: notice.publishedAt?.toISOString() ?? null,
    legacyWrId: notice.legacyWrId,
    // 저장할 때 이미 정리했지만 내보낼 때도 같은 기준으로 한 번 더 거른다. (ADR-006)
    body: sanitizeNoticeHtml(notice.body),
    attachments: notice.attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      sizeBytes: attachment.sizeBytes,
    })),
  };
}

/** 공개 첨부 내려받기용 조회. 게시된 글의 첨부만 찾는다. */
export async function getPublicNoticeAttachment(
  attachmentId: string,
  now: Date = new Date(),
): Promise<{ storageKey: string; filename: string; contentType: string }> {
  const attachment = await db.noticeAttachment.findFirst({
    where: { id: attachmentId, notice: publicWhere(now) },
    select: { storageKey: true, filename: true, contentType: true },
  });
  if (!attachment) throw notFound();
  return attachment;
}

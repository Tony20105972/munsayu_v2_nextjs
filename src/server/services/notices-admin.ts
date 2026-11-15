import "server-only";
import {
  type AdminNoticeList,
  type AdminNoticeRow,
  type NoticeAdminListInput,
  type NoticeDeleteInput,
  type NoticeUpsertInput,
} from "@/lib/contracts";
import { createStorageKey, getStorageAdapter } from "@/server/adapters/storage";
import { db } from "@/server/db";
import { notFound, validationFailed } from "@/server/errors";
import { detectImageFormat, detectResumeFormat } from "@/server/lib/file-format";
import { sanitizeNoticeHtml } from "@/server/lib/sanitize-notice-html";

/**
 * AD-014 공지사항 관리.
 *
 * 레거시 게시판은 그누보드 `notice` 하나뿐이어서(EV-ADM-10/11) 게시판 엔진은 옮기지 않고
 * 공지사항 단일 게시판으로 만든다. 게시판이 더 필요해지면 그때 늘린다. // ASM-089
 *
 * 본문 HTML 은 **저장 전에** 허용 목록으로 정리한다. 화면에서 거르는 것에 기대지 않는다.
 */

/**
 * 첨부파일 용량 상한.
 * 본문 **이미지**는 AD-015 공통 업로드가 맡는다(`src/server/services/media.ts`).
 * 그래서 형식 검사·크기 줄이기·EXIF 제거가 보관함과 똑같이 적용된다.
 */
export const NOTICE_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

export type AdminNoticeDetail = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  legacyWrId: number | null;
  attachments: Array<{ id: string; filename: string; sizeBytes: number }>;
};

export async function listAdminNotices(
  filter: NoticeAdminListInput,
): Promise<AdminNoticeList> {
  const where = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.keyword ? { title: { contains: filter.keyword } } : {}),
  };

  const [total, rows] = await Promise.all([
    db.notice.count({ where }),
    db.notice.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: { _count: { select: { attachments: true } } },
    }),
  ]);

  const items: AdminNoticeRow[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    isPinned: row.isPinned,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    legacyWrId: row.legacyWrId,
    attachmentCount: row._count.attachments,
    updatedAt: row.updatedAt.toISOString(),
  }));

  return { items, total, page: filter.page, pageSize: filter.pageSize };
}

export async function getAdminNotice(noticeId: string): Promise<AdminNoticeDetail> {
  const notice = await db.notice.findUnique({
    where: { id: noticeId },
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
    body: notice.body,
    isPinned: notice.isPinned,
    status: notice.status,
    publishedAt: notice.publishedAt?.toISOString() ?? null,
    legacyWrId: notice.legacyWrId,
    attachments: notice.attachments,
  };
}

/**
 * 작성·수정. 본문은 정리한 결과만 저장한다.
 * `PUBLISHED` 인데 게시 시각이 비어 있으면 지금 시각을 넣는다. 임시 저장은 시각을 비운다.
 */
export async function upsertNotice(
  input: NoticeUpsertInput,
  now: Date = new Date(),
): Promise<{ id: string }> {
  const body = sanitizeNoticeHtml(input.body);
  const publishedAt =
    input.status === "PUBLISHED" ? (input.publishedAt ?? now) : input.publishedAt;

  const data = {
    title: input.title,
    body,
    isPinned: input.isPinned,
    status: input.status,
    publishedAt,
  };

  const row = input.id
    ? await db.notice.update({ where: { id: input.id }, data, select: { id: true } })
    : await db.notice.create({ data, select: { id: true } });

  return { id: row.id };
}

/** 글을 지우면 딸린 첨부 행(onDelete: Cascade)과 저장된 파일도 함께 지운다. */
export async function deleteNotices(
  input: NoticeDeleteInput,
): Promise<{ deleted: number; removedFiles: number }> {
  const attachments = await db.noticeAttachment.findMany({
    where: { noticeId: { in: input.noticeIds } },
    select: { storageKey: true },
  });

  const result = await db.notice.deleteMany({ where: { id: { in: input.noticeIds } } });

  const storage = getStorageAdapter();
  let removedFiles = 0;
  for (const attachment of attachments) {
    await storage.remove("public", attachment.storageKey).catch(() => undefined);
    removedFiles += 1;
  }

  return { deleted: result.count, removedFiles };
}

/** 글 첨부 파일. 본문 이미지와 달리 문서 형식만 받는다. */
export async function addNoticeAttachment(
  noticeId: string,
  file: { filename: string; bytes: Uint8Array },
): Promise<{ id: string }> {
  const notice = await db.notice.findUnique({
    where: { id: noticeId },
    select: { id: true },
  });
  if (!notice) throw notFound();

  if (file.bytes.byteLength > NOTICE_ATTACHMENT_MAX_BYTES) {
    throw validationFailed({
      attachment: [
        `첨부파일은 ${NOTICE_ATTACHMENT_MAX_BYTES / (1024 * 1024)}MB 이하여야 합니다.`,
      ],
    });
  }

  const documentFormat = detectResumeFormat(file.bytes);
  const imageFormat = detectImageFormat(file.bytes);
  if (!documentFormat && !imageFormat) {
    throw validationFailed({
      attachment: ["PDF, DOCX, HWP, HWPX 문서 또는 이미지 파일만 첨부할 수 있습니다."],
    });
  }

  const extension = documentFormat ?? imageFormat?.format ?? "bin";
  const contentType = imageFormat?.contentType ?? "application/octet-stream";
  const key = createStorageKey("notice-attachments", extension);
  await getStorageAdapter().put("public", key, file.bytes, contentType);

  const created = await db.noticeAttachment.create({
    data: {
      noticeId,
      storageKey: key,
      filename: file.filename.slice(0, 200),
      contentType,
      sizeBytes: file.bytes.byteLength,
    },
    select: { id: true },
  });

  return { id: created.id };
}

export async function removeNoticeAttachment(attachmentId: string): Promise<void> {
  const attachment = await db.noticeAttachment.findUnique({
    where: { id: attachmentId },
    select: { id: true, storageKey: true },
  });
  if (!attachment) throw notFound();

  await db.noticeAttachment.delete({ where: { id: attachment.id } });
  await getStorageAdapter()
    .remove("public", attachment.storageKey)
    .catch(() => undefined);
}

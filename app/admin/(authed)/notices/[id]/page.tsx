import Link from "next/link";
import { notFound } from "next/navigation";
import { NoticeAttachmentsPanel, NoticeForm } from "@/components/admin/notices-panels";
import { AdminPageHeading, AdminPanel } from "@/components/admin/ui";
import { AppError } from "@/server/errors";
import { getAdminNotice } from "@/server/services/notices-admin";

/** AD-014 공지 수정. 첨부파일은 글이 있어야 올릴 수 있어 이 화면에만 둔다. */
export const instant = false;

/** `datetime-local` 입력이 쓰는 한국 시간 문자열(YYYY-MM-DDTHH:mm)로 바꾼다. */
function toKstLocalInput(iso: string | null): string {
  if (!iso) return "";
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
}

export default async function AdminNoticeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const notice = await getAdminNotice(id).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  return (
    <>
      <AdminPageHeading
        featureId="AD-014"
        title="공지 수정"
        description={
          notice.legacyWrId !== null
            ? `레거시 글 번호 ${notice.legacyWrId} 에서 가져온 글입니다. 예전 주소(/bbs/board.php?bo_table=notice&wr_id=${notice.legacyWrId})는 이 글로 연결됩니다.`
            : undefined
        }
      >
        <Link
          href="/admin/notices"
          className="rounded-md border border-line bg-canvas px-3 py-2 text-sm font-bold text-ink hover:bg-line/40"
        >
          목록으로
        </Link>
      </AdminPageHeading>

      <AdminPanel title="내용" headingId="notice-edit">
        <NoticeForm
          values={{
            id: notice.id,
            title: notice.title,
            body: notice.body,
            isPinned: notice.isPinned,
            status: notice.status,
            publishedAtLocal: toKstLocalInput(notice.publishedAt),
          }}
        />
      </AdminPanel>

      <AdminPanel
        title="첨부파일"
        headingId="notice-attachments"
        description="PDF, DOCX, HWP, HWPX 문서와 이미지 파일을 올릴 수 있습니다."
      >
        <NoticeAttachmentsPanel noticeId={notice.id} attachments={notice.attachments} />
      </AdminPanel>
    </>
  );
}

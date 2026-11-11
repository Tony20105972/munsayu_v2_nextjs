import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBanner } from "@/components/ui/page-banner";
import { findNoticeStub, listNoticesStub } from "@/lib/data/stubs";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

type NoticeDetailPageProps = {
  /** Next.js 16 의 동적 세그먼트 params 는 Promise 다. (.next/types/validator.ts 확인) */
  params: Promise<{ id: string }>;
};

/**
 * PG-012 공지 상세.
 * 레거시 상세 URL 형식 `/bbs/board.php?bo_table=notice&wr_id={id}` 를 `/notice/{id}` 로 받는다. (RT-001)
 * 본문은 관찰하지 못했고 관리자 공지 데이터로 대체한다. (ASM-015)
 */
export async function generateMetadata({
  params,
}: NoticeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const notice = findNoticeStub(id);

  if (!notice) {
    return buildPageMetadata({
      title: pageTitle("공지사항"),
      description: "문해와 사유의 설명회·수업 관련 공지사항을 안내합니다.",
      path: "/notice",
    });
  }

  return buildPageMetadata({
    title: pageTitle(notice.title),
    description: `${notice.title} — 문해와 사유 공지사항`,
    path: `/notice/${notice.id}`,
  });
}

export function generateStaticParams() {
  return listNoticesStub().map((notice) => ({ id: notice.id }));
}

export default async function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { id } = await params;
  const notice = findNoticeStub(id);

  if (!notice) {
    notFound();
  }

  return (
    <>
      <PageBanner title="공지사항" />

      <section className="bg-canvas">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <article className="rounded-xl border border-line bg-surface p-6">
            <h2 className="text-xl font-bold text-ink">{notice.title}</h2>
            <p className="mt-2 text-sm text-muted">
              {notice.author} · {notice.dateText}
            </p>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
              {notice.bodyParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>

          <p className="mt-6">
            <Link
              href="/notice"
              className="text-sm font-bold text-brand hover:underline"
            >
              목록으로
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

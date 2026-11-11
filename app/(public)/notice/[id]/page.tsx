import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";
import {
  formatNoticeDetailDate,
  toParagraphs,
  NOTICE_AUTHOR_LABEL,
} from "@/lib/view-models";
import { AppError } from "@/server/errors";
import { getNotice, type NoticeDetail } from "@/server/services/notices";

/**
 * 없는 공지는 404 로 답해야 한다. 정적 껍데기를 먼저 흘려보내면 `notFound()` 가
 * 상태 코드를 바꿀 수 없으므로(껍데기가 이미 200 으로 나감) 이 경로만 막고 그린다.
 * 그래서 본문 조회를 `Suspense` 로 감싸지 않고 페이지에서 바로 기다린다.
 */
export const instant = false;

type NoticeDetailPageProps = {
  /** Next.js 16 의 동적 세그먼트 params 는 Promise 다. (.next/types/validator.ts 확인) */
  params: Promise<{ id: string }>;
};

/**
 * PG-012 공지 상세.
 * 레거시 상세 URL 형식 `/bbs/board.php?bo_table=notice&wr_id={id}` 를 `/notice/{id}` 로 받는다. (RT-001)
 * 게시되지 않은 글과 없는 글은 모두 404 다. (ASM-015)
 */
async function findNotice(id: string): Promise<NoticeDetail | null> {
  // 공지 조회는 `publishedAt <= 지금` 을 보므로 현재 시각에 의존한다.
  // `cacheComponents` 환경에서 그 값을 미리 굳히지 않도록 요청 시점 렌더임을 알린다.
  await connection();

  try {
    return await getNotice(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata({
  params,
}: NoticeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const notice = await findNotice(id);

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

export default async function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { id } = await params;
  const notice = await findNotice(id);

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
              {NOTICE_AUTHOR_LABEL} · {formatNoticeDetailDate(notice.publishedAt)}
            </p>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
              {toParagraphs(notice.body).map((paragraph) => (
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

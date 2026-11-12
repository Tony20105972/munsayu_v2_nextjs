import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadingBlock } from "@/components/ui/loading-block";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_TITLE_SUFFIX } from "@/lib/site-config";
import { toNoticeRowViews } from "@/lib/view-models";
import { NOTICE_PAGE_SIZE, listNotices } from "@/server/services/notices";

/**
 * PG-012 공지사항 목록.
 * 근거: docs/evidence/dom/phase1-notice.yml — 배너 문구, 표 머리글, 번호·작성자·날짜 칸. (EV-0007)
 * 관찰된 title 은 `공지사항 페이지 | ...` 이다. (legacy-seo-map.md)
 * 레거시 목록의 `검색` 버튼은 서버 검색 계약이 없어 이번 범위에서 넣지 않는다. // ASM-054
 */
export const metadata = buildPageMetadata({
  title: `공지사항 페이지 | ${SITE_TITLE_SUFFIX}`,
  description: "문해와 사유의 설명회·수업 관련 공지사항을 안내합니다.",
  path: "/notice",
});

/** 레거시 목록이 한 쪽에 15건이었다. (`1 / 15 Page`, EV-0007) */
const PAGE_SIZE = NOTICE_PAGE_SIZE;

type NoticeListPageProps = {
  /** Next.js 16 에서 `searchParams` 는 Promise 다. */
  searchParams: Promise<{ page?: string }>;
};

function toPageNumber(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

async function NoticeTable({ searchParams }: NoticeListPageProps) {
  // 공지 목록은 `publishedAt <= 지금` 으로 걸러지므로 현재 시각에 의존한다.
  // 그 값이 빌드 시점에 굳지 않도록 요청 시점 렌더임을 알린다. (Suspense 경계 안)
  await connection();

  const { page: rawPage } = await searchParams;
  const page = toPageNumber(rawPage);
  const list = await listNotices({ page, pageSize: PAGE_SIZE });
  const rows = toNoticeRowViews(list.items, {
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
  });
  const lastPage = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-sm text-muted">
        Total <strong className="font-bold text-ink">{list.total}</strong>건 |{" "}
        {list.page} / {lastPage} Page
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-xl border-collapse text-sm">
          <caption className="sr-only">공지사항 목록</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="w-20 px-5 py-4 font-bold">
                번호
              </th>
              <th scope="col" className="px-5 py-4 font-bold">
                제목
              </th>
              <th scope="col" className="w-28 px-5 py-4 font-bold">
                작성자
              </th>
              <th scope="col" className="w-28 px-5 py-4 font-bold">
                날짜
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted">
                  등록된 공지사항이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((notice) => (
                <tr key={notice.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-4 text-muted">
                    {notice.pinned ? (
                      <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">
                        공지
                      </span>
                    ) : (
                      notice.listNumber
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/notice/${notice.id}`}
                      className="font-bold text-ink hover:text-brand hover:underline"
                    >
                      {notice.title}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted">{notice.author}</td>
                  <td className="px-5 py-4 text-muted">{notice.dateText}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {lastPage > 1 ? (
        <nav
          aria-label="공지사항 페이지 이동"
          className="mt-6 flex justify-center gap-2"
        >
          {Array.from({ length: lastPage }, (_, index) => index + 1).map((number) => (
            <Link
              key={number}
              href={number === 1 ? "/notice" : `/notice?page=${number}`}
              aria-current={number === list.page ? "page" : undefined}
              className={
                number === list.page
                  ? "rounded-md bg-brand px-3 py-2 text-sm font-bold text-white"
                  : "rounded-md border border-line bg-surface px-3 py-2 text-sm font-bold text-ink hover:bg-canvas"
              }
            >
              {number}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

export default function NoticeListPage({ searchParams }: NoticeListPageProps) {
  return (
    <>
      <PageBanner
        title="공지사항"
        description="대치동 논술·구술 합격의 산실, 문사유 논술학원입니다."
      />

      <section className="bg-canvas">
        <Suspense fallback={<LoadingBlock label="공지사항을 불러오고 있습니다." />}>
          <NoticeTable searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}

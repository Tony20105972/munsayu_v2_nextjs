import Link from "next/link";
import { PageBanner } from "@/components/ui/page-banner";
import { countNoticesStub, listNoticesStub } from "@/lib/data/stubs";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_TITLE_SUFFIX } from "@/lib/site-config";

/**
 * PG-012 공지사항 목록.
 * 근거: docs/evidence/dom/phase1-notice.yml — 배너 문구, 표 머리글, 공지 2건. (EV-0007)
 * 관찰된 title 은 `공지사항 페이지 | ...` 이다. (legacy-seo-map.md)
 * 레거시 목록의 `검색` 버튼은 서버 검색 계약이 없어 이번 범위에서 넣지 않는다. // ASM-054
 */
export const metadata = buildPageMetadata({
  title: `공지사항 페이지 | ${SITE_TITLE_SUFFIX}`,
  description: "문해와 사유의 설명회·수업 관련 공지사항을 안내합니다.",
  path: "/notice",
});

export default function NoticeListPage() {
  const notices = listNoticesStub();
  const total = countNoticesStub();

  return (
    <>
      <PageBanner
        title="공지사항"
        description="대치동 논술·구술 합격의 산실, 문사유 논술학원입니다."
      />

      <section className="bg-canvas">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <p className="text-sm text-muted">
            Total <strong className="font-bold text-ink">{total}</strong>건 | 1 / 1 Page
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
                {notices.map((notice) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { NoticeForm, NoticesTable } from "@/components/admin/notices-panels";
import { AdminPageHeading, AdminPanel } from "@/components/admin/ui";
import { noticeAdminListSchema, type NoticeAdminListInput } from "@/lib/contracts";
import { listAdminNotices } from "@/server/services/notices-admin";

/**
 * AD-014 공지사항 관리 목록과 새 글 작성.
 *
 * 레거시 게시판 엔진(게시판·그룹·포인트·스킨)은 옮기지 않는다. 공지 하나만 관리한다.
 * (EV-ADM-10, EV-ADM-11) // ASM-089
 */
export const instant = false;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pick(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "" ? undefined : first;
}

export default async function AdminNoticesPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const candidate: Record<string, string> = {};
  for (const key of ["status", "keyword", "page"]) {
    const value = pick(raw[key]);
    if (value !== undefined) candidate[key] = value;
  }

  const parsed = noticeAdminListSchema.safeParse(candidate);
  const filter: NoticeAdminListInput = parsed.success
    ? parsed.data
    : noticeAdminListSchema.parse({});

  const list = await listAdminNotices(filter);
  const lastPage = Math.max(1, Math.ceil(list.total / list.pageSize));

  function pageHref(page: number): string {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.keyword) params.set("keyword", filter.keyword);
    if (page > 1) params.set("page", String(page));
    return `/admin/notices?${params.toString()}`;
  }

  return (
    <>
      <AdminPageHeading
        featureId="AD-014"
        title="공지사항"
        description="공개 화면의 공지 목록·상세에 나가는 글을 관리합니다. 임시 저장 글은 공개되지 않습니다."
      />

      <AdminPanel title="보기 조건" headingId="notice-filter">
        <form
          method="get"
          action="/admin/notices"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label htmlFor="nt-keyword" className="block text-xs font-bold text-ink">
              제목
            </label>
            <input
              id="nt-keyword"
              name="keyword"
              defaultValue={filter.keyword ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="nt-status" className="block text-xs font-bold text-ink">
              게시 상태
            </label>
            <select
              id="nt-status"
              name="status"
              defaultValue={filter.status ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              <option value="PUBLISHED">게시</option>
              <option value="DRAFT">임시 저장</option>
            </select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              검색
            </button>
            <Link
              href="/admin/notices"
              className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/40"
            >
              초기화
            </Link>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title={`공지 목록 (${list.total}건 중 ${list.items.length}건)`}
        headingId="notice-list"
      >
        <NoticesTable rows={list.items} />

        {lastPage > 1 ? (
          <nav aria-label="공지 목록 페이지 이동" className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: lastPage }, (_, index) => index + 1).map((number) => (
              <Link
                key={number}
                href={pageHref(number)}
                aria-current={number === list.page ? "page" : undefined}
                className={
                  number === list.page
                    ? "rounded-md bg-brand px-3 py-1.5 text-sm font-bold text-white"
                    : "rounded-md border border-line bg-canvas px-3 py-1.5 text-sm font-bold text-ink hover:bg-line/40"
                }
              >
                {number}
              </Link>
            ))}
          </nav>
        ) : null}
      </AdminPanel>

      <AdminPanel
        title="새 공지 작성"
        headingId="notice-create"
        description="본문 HTML 은 저장할 때 서버가 허용 목록으로 정리합니다. 첨부파일은 글을 저장한 뒤 수정 화면에서 올립니다."
      >
        <NoticeForm />
      </AdminPanel>
    </>
  );
}

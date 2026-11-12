import Link from "next/link";
import {
  InstructorApplicationsTable,
  InstructorStatusOptionsPanel,
} from "@/components/admin/instructor-applications-panels";
import {
  AdminPageHeading,
  AdminPanel,
  AuditNotice,
  MaskedHint,
} from "@/components/admin/ui";
import {
  instructorApplicationFilterSchema,
  type InstructorApplicationFilterInput,
} from "@/lib/contracts";
import {
  listInstructorApplications,
  listInstructorStatusOptions,
} from "@/server/services/instructor-applications";

/**
 * AD-011 강사지원관리.
 *
 * 레거시 화면(EV-ADM-09)을 기준으로 만들었다: 전체 지원자 수, 강사 실명 검색,
 * 목록 열, 선택수정·선택삭제.
 * 제출 서류는 공개 주소가 없고 이 화면의 「내려받기」만이 유일한 출구다. 내려받기는 기록에 남는다.
 */
export const instant = false;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pick(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "" ? undefined : first;
}

function queryParams(filter: InstructorApplicationFilterInput): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.keyword) params.set("keyword", filter.keyword);
  if (filter.status) params.set("status", filter.status);
  if (filter.from) params.set("from", filter.from.toISOString());
  if (filter.to) params.set("to", filter.to.toISOString());
  return params;
}

export default async function AdminInstructorApplicationsPage({
  searchParams,
}: PageProps) {
  const raw = await searchParams;
  const candidate: Record<string, string> = {};
  for (const key of ["keyword", "status", "from", "to", "page"]) {
    const value = pick(raw[key]);
    if (value !== undefined) candidate[key] = value;
  }

  const parsed = instructorApplicationFilterSchema.safeParse(candidate);
  const filter: InstructorApplicationFilterInput = parsed.success
    ? parsed.data
    : instructorApplicationFilterSchema.parse({});

  const [list, statuses] = await Promise.all([
    listInstructorApplications(filter),
    listInstructorStatusOptions(),
  ]);

  const lastPage = Math.max(1, Math.ceil(list.total / list.pageSize));
  const exportHref = `/api/admin/instructor-applications/export?${queryParams(filter).toString()}`;

  function pageHref(page: number): string {
    const params = queryParams(filter);
    if (page > 1) params.set("page", String(page));
    return `/admin/instructor-applications?${params.toString()}`;
  }

  return (
    <>
      <AdminPageHeading
        featureId="AD-011"
        title="강사지원관리"
        description={`전체 지원자수: ${list.total}명. 기본으로 이름·연락처·학력을 가려서 보여 줍니다.`}
      >
        <a
          href={exportHref}
          className="rounded-md border border-accent/60 bg-accent/10 px-3 py-2 text-sm font-bold text-ink hover:bg-accent/20"
        >
          현재 조건 전체 CSV 내려받기
        </a>
      </AdminPageHeading>

      <AdminPanel title="보기 조건" headingId="instructor-application-filter">
        <form
          method="get"
          action="/admin/instructor-applications"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label htmlFor="ia-keyword" className="block text-xs font-bold text-ink">
              강사 실명
            </label>
            <input
              id="ia-keyword"
              name="keyword"
              defaultValue={filter.keyword ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="ia-status" className="block text-xs font-bold text-ink">
              상태
            </label>
            <select
              id="ia-status"
              name="status"
              defaultValue={filter.status ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.label}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ia-from" className="block text-xs font-bold text-ink">
              지원일 시작
            </label>
            <input
              id="ia-from"
              name="from"
              type="date"
              defaultValue={filter.from ? filter.from.toISOString().slice(0, 10) : ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="ia-to" className="block text-xs font-bold text-ink">
              지원일 끝
            </label>
            <input
              id="ia-to"
              name="to"
              type="date"
              defaultValue={filter.to ? filter.to.toISOString().slice(0, 10) : ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              검색
            </button>
            <Link
              href="/admin/instructor-applications"
              className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/40"
            >
              초기화
            </Link>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title={`지원 목록 (${list.total}건 중 ${list.items.length}건)`}
        headingId="instructor-application-list"
      >
        <AuditNotice>
          「원문 보기」·「이력서 내려받기」·「CSV 내려받기」는 누가 언제 어느 건을
          봤는지 기록에 남습니다. 내려받은 서류는 채용 목적 밖으로 공유하지 말아 주세요.
        </AuditNotice>
        <div className="mt-2">
          <MaskedHint />
        </div>

        <div className="mt-3">
          <InstructorApplicationsTable rows={list.items} statuses={statuses} />
        </div>

        {lastPage > 1 ? (
          <nav aria-label="지원 목록 페이지 이동" className="mt-4 flex flex-wrap gap-2">
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
        title="지원 상태 관리"
        headingId="instructor-status-options"
        description="목록에서 고를 수 있는 상태를 관리합니다. 기본값은 접수·검토중·완료입니다."
      >
        <InstructorStatusOptionsPanel statuses={statuses} />
      </AdminPanel>
    </>
  );
}

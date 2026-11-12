import Link from "next/link";
import {
  ConsultationTypesPanel,
  ConsultationsTable,
} from "@/components/admin/consultations-panels";
import {
  AdminPageHeading,
  AdminPanel,
  AuditNotice,
  MaskedHint,
} from "@/components/admin/ui";
import {
  CONSULTATION_STATUSES,
  CONSULTATION_STATUS_LABELS,
  consultationFilterSchema,
  type ConsultationFilterInput,
} from "@/lib/contracts";
import {
  listConsultationApplications,
  listConsultationTypes,
} from "@/server/services/consultations";

/**
 * AD-009 입학진단 및 상담 신청관리.
 *
 * 레거시 관리자 화면(EV-ADM-08)을 기준으로 만들었다: 상태별 건수, 학부모 성함 검색,
 * 목록의 처리 상태 선택 상자, 선택수정·선택삭제.
 * 이름·연락처는 서버가 가린 값만 내려오고 원문 조회·CSV 는 기록에 남는다. (AD-013)
 */
export const instant = false;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pick(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "" ? undefined : first;
}

function queryParams(filter: ConsultationFilterInput): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.keyword) params.set("keyword", filter.keyword);
  if (filter.consultationTypeId)
    params.set("consultationTypeId", filter.consultationTypeId);
  if (filter.from) params.set("from", filter.from.toISOString());
  if (filter.to) params.set("to", filter.to.toISOString());
  return params;
}

export default async function AdminConsultationsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const candidate: Record<string, string> = {};
  for (const key of ["status", "keyword", "consultationTypeId", "from", "to", "page"]) {
    const value = pick(raw[key]);
    if (value !== undefined) candidate[key] = value;
  }

  const parsed = consultationFilterSchema.safeParse(candidate);
  const filter: ConsultationFilterInput = parsed.success
    ? parsed.data
    : consultationFilterSchema.parse({});

  const [list, types] = await Promise.all([
    listConsultationApplications(filter),
    listConsultationTypes(),
  ]);

  const lastPage = Math.max(1, Math.ceil(list.total / list.pageSize));
  const exportHref = `/api/admin/consultations/export?${queryParams(filter).toString()}`;

  function pageHref(page: number): string {
    const params = queryParams(filter);
    if (page > 1) params.set("page", String(page));
    return `/admin/consultations?${params.toString()}`;
  }

  return (
    <>
      <AdminPageHeading
        featureId="AD-009"
        title="입학진단 및 상담 신청관리"
        description="사이트 안에서 받은 입학진단·상담 신청을 봅니다. 기본으로 이름·연락처를 가려서 보여 줍니다."
      >
        <a
          href={exportHref}
          className="rounded-md border border-accent/60 bg-accent/10 px-3 py-2 text-sm font-bold text-ink hover:bg-accent/20"
        >
          현재 조건 전체 CSV 내려받기
        </a>
      </AdminPageHeading>

      {/* EV-ADM-08 상단의 상태별 건수 */}
      <AdminPanel title="상태별 건수" headingId="consultation-counts">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "총 신청", value: list.counts.total },
            { label: CONSULTATION_STATUS_LABELS.PENDING, value: list.counts.pending },
            {
              label: CONSULTATION_STATUS_LABELS.COMPLETED,
              value: list.counts.completed,
            },
            {
              label: CONSULTATION_STATUS_LABELS.CANCELLED,
              value: list.counts.cancelled,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-md border border-line bg-canvas p-3"
            >
              <dt className="text-xs font-bold text-muted">{item.label}</dt>
              <dd className="mt-1 text-lg font-bold text-ink">{item.value}건</dd>
            </div>
          ))}
        </dl>
      </AdminPanel>

      <AdminPanel title="보기 조건" headingId="consultation-filter">
        <form
          method="get"
          action="/admin/consultations"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label htmlFor="cs-keyword" className="block text-xs font-bold text-ink">
              학부모 성함 · 연락처
            </label>
            <input
              id="cs-keyword"
              name="keyword"
              defaultValue={filter.keyword ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="cs-status" className="block text-xs font-bold text-ink">
              처리 상태
            </label>
            <select
              id="cs-status"
              name="status"
              defaultValue={filter.status ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              {CONSULTATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CONSULTATION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cs-type" className="block text-xs font-bold text-ink">
              상담 유형
            </label>
            <select
              id="cs-type"
              name="consultationTypeId"
              defaultValue={filter.consultationTypeId ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cs-from" className="block text-xs font-bold text-ink">
              신청일 시작
            </label>
            <input
              id="cs-from"
              name="from"
              type="date"
              defaultValue={filter.from ? filter.from.toISOString().slice(0, 10) : ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              적용
            </button>
            <Link
              href="/admin/consultations"
              className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/40"
            >
              초기화
            </Link>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title={`신청 목록 (${list.total}건 중 ${list.items.length}건)`}
        headingId="consultation-list"
      >
        <AuditNotice>
          「원문 보기」와 「CSV 내려받기」는 누가 언제 어떤 조건으로 했는지 기록에
          남습니다. CSV 파일에는 가리지 않은 이름·연락처가 들어 있으니 내려받은 파일을
          공유하지 말아 주세요.
        </AuditNotice>
        <div className="mt-2">
          <MaskedHint />
        </div>

        <div className="mt-3">
          <ConsultationsTable rows={list.items} />
        </div>

        {lastPage > 1 ? (
          <nav aria-label="신청 목록 페이지 이동" className="mt-4 flex flex-wrap gap-2">
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
        title="상담 유형 관리"
        headingId="consultation-types"
        description="신청 폼의 「상담 유형」 선택지를 관리합니다. 이미 신청에 쓰인 유형은 지우지 않고 숨깁니다."
      >
        <ConsultationTypesPanel types={types} />
      </AdminPanel>
    </>
  );
}

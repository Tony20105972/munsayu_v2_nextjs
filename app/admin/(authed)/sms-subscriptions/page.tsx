import Link from "next/link";
import { SmsSubscriptionsTable } from "@/components/admin/sms-subscriptions-panels";
import {
  AdminPageHeading,
  AdminPanel,
  AuditNotice,
  MaskedHint,
} from "@/components/admin/ui";
import {
  ELEMENTARY_GRADES,
  smsSubscriptionFilterSchema,
  type SmsSubscriptionFilterInput,
} from "@/lib/contracts";
import { listSmsSubscriptions } from "@/server/services/sms-subscriptions";

/**
 * AD-010 문자신청내역 (설명회 알림 신청).
 * 레거시 메뉴 이름을 따르되 **문자 발송 기능은 없다.** 신청 내역 보기와 CSV 만 있다. (D4)
 */
export const instant = false;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pick(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "" ? undefined : first;
}

function queryParams(filter: SmsSubscriptionFilterInput): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.keyword) params.set("keyword", filter.keyword);
  if (filter.grade) params.set("grade", filter.grade);
  if (filter.from) params.set("from", filter.from.toISOString());
  if (filter.to) params.set("to", filter.to.toISOString());
  return params;
}

export default async function AdminSmsSubscriptionsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const candidate: Record<string, string> = {};
  for (const key of ["keyword", "grade", "from", "to", "page"]) {
    const value = pick(raw[key]);
    if (value !== undefined) candidate[key] = value;
  }

  const parsed = smsSubscriptionFilterSchema.safeParse(candidate);
  const filter: SmsSubscriptionFilterInput = parsed.success
    ? parsed.data
    : smsSubscriptionFilterSchema.parse({});

  const list = await listSmsSubscriptions(filter);
  const lastPage = Math.max(1, Math.ceil(list.total / list.pageSize));

  function pageHref(page: number): string {
    const params = queryParams(filter);
    if (page > 1) params.set("page", String(page));
    return `/admin/sms-subscriptions?${params.toString()}`;
  }

  return (
    <>
      <AdminPageHeading
        featureId="AD-010"
        title="문자신청내역"
        description="홈 화면 아래에서 받은 설명회 알림 신청입니다. 이 화면에서 문자를 보내지는 않습니다. 직원이 직접 연락합니다."
      >
        <a
          href={`/api/admin/sms-subscriptions/export?${queryParams(filter).toString()}`}
          className="rounded-md border border-accent/60 bg-accent/10 px-3 py-2 text-sm font-bold text-ink hover:bg-accent/20"
        >
          현재 조건 전체 CSV 내려받기
        </a>
      </AdminPageHeading>

      <AdminPanel title="보기 조건" headingId="sms-filter">
        <form
          method="get"
          action="/admin/sms-subscriptions"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label htmlFor="sms-keyword" className="block text-xs font-bold text-ink">
              학생 이름 · 학교 · 연락처
            </label>
            <input
              id="sms-keyword"
              name="keyword"
              defaultValue={filter.keyword ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="sms-grade" className="block text-xs font-bold text-ink">
              학년
            </label>
            <select
              id="sms-grade"
              name="grade"
              defaultValue={filter.grade ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              {ELEMENTARY_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sms-from" className="block text-xs font-bold text-ink">
              신청일 시작
            </label>
            <input
              id="sms-from"
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
              검색
            </button>
            <Link
              href="/admin/sms-subscriptions"
              className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/40"
            >
              초기화
            </Link>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title={`알림 신청 목록 (${list.total}건 중 ${list.items.length}건)`}
        headingId="sms-list"
      >
        <AuditNotice>
          「원문 보기」와 「CSV 내려받기」는 기록에 남습니다. CSV 에는 가리지 않은
          이름·연락처가 들어 있으니 내려받은 파일을 공유하지 말아 주세요.
        </AuditNotice>
        <div className="mt-2">
          <MaskedHint />
        </div>

        <div className="mt-3">
          <SmsSubscriptionsTable rows={list.items} />
        </div>

        {lastPage > 1 ? (
          <nav aria-label="알림 신청 페이지 이동" className="mt-4 flex flex-wrap gap-2">
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
    </>
  );
}

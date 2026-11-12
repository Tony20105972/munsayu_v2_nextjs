import Link from "next/link";
import {
  AdminAccountCreateForm,
  AdminAccountDeleteButton,
  MemberStatusForm,
  STATUS_LABEL,
} from "@/components/admin/members-panels";
import {
  ADMIN_TABLE_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminEmptyRow,
  AdminPageHeading,
  AdminPanel,
  AdminTableScroll,
  AuditNotice,
  MaskedHint,
} from "@/components/admin/ui";
import { memberSearchSchema, type AccountStatus } from "@/lib/contracts";
import { formatDateTime } from "@/lib/view-models";
import { getAdminUserFromCookies } from "@/server/auth/server-component-session";
import { memberCountsByStatus, searchMembers } from "@/server/services/members";

/**
 * AD-002 회원 관리.
 *
 * 레거시 회원관리(EV-ADM-02)에서 그누보드 전용 칸(포인트·성인인증·접근그룹·메일인증 등)은
 * 옮기지 않았다. BLUEPRINT 7장에서 제공하지 않기로 확정한 항목이다.
 * 목록의 이름·이메일·연락처는 서버가 가린 값만 돌려준다. (BLUEPRINT 10장)
 */
export const instant = false;

/** 관리자 계정 묶음을 만들기 위해 한 번에 읽는 최대 건수. 역할 필터 계약이 없다. // ASM-078 */
const ADMIN_SCAN_PAGE_SIZE = 100;

type MembersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value === "" ? undefined : value;
}

export default async function AdminMembersPage({ searchParams }: MembersPageProps) {
  const raw = await searchParams;
  const parsed = memberSearchSchema.safeParse({
    ...(firstValue(raw.keyword) ? { keyword: firstValue(raw.keyword) } : {}),
    ...(firstValue(raw.status) ? { status: firstValue(raw.status) } : {}),
    ...(firstValue(raw.page) ? { page: firstValue(raw.page) } : {}),
  });
  const filter = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 20, keyword: undefined, status: undefined };

  const [list, counts, adminScan, currentAdmin] = await Promise.all([
    searchMembers(filter),
    memberCountsByStatus(),
    searchMembers({ page: 1, pageSize: ADMIN_SCAN_PAGE_SIZE }),
    getAdminUserFromCookies(),
  ]);

  const adminAccounts = adminScan.items.filter((member) => member.role === "ADMIN");
  const lastPage = Math.max(1, Math.ceil(list.total / list.pageSize));

  function pageHref(page: number): string {
    const params = new URLSearchParams();
    if (filter.keyword) params.set("keyword", filter.keyword);
    if (filter.status) params.set("status", filter.status);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/admin/members?${query}` : "/admin/members";
  }

  return (
    <>
      <AdminPageHeading
        featureId="AD-002"
        title="회원 관리"
        description="회원을 검색하고 상태를 바꿉니다. 관리자 계정도 여기서 추가·삭제합니다."
      />

      <AdminPanel title="회원 수" headingId="member-counts">
        <dl className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(counts) as AccountStatus[]).map((status) => (
            <div key={status} className="rounded-md border border-line px-3 py-2">
              <dt className="text-xs text-muted">{STATUS_LABEL[status]}</dt>
              <dd className="mt-1 text-base font-bold text-ink">{counts[status]}명</dd>
            </div>
          ))}
        </dl>
      </AdminPanel>

      <AdminPanel
        title="회원 검색"
        headingId="member-search"
        description="아이디 또는 이름의 일부로 찾습니다. 검색어는 기록에 남기지 않습니다."
      >
        <form method="get" action="/admin/members" className="flex flex-wrap gap-3">
          <div>
            <label
              htmlFor="member-keyword"
              className="block text-xs font-bold text-ink"
            >
              검색어
            </label>
            <input
              id="member-keyword"
              name="keyword"
              type="search"
              defaultValue={filter.keyword ?? ""}
              className="mt-1 w-56 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="member-status" className="block text-xs font-bold text-ink">
              상태
            </label>
            <select
              id="member-status"
              name="status"
              defaultValue={filter.status ?? ""}
              className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              <option value="ACTIVE">이용 중</option>
              <option value="BLOCKED">차단</option>
              <option value="WITHDRAWN">탈퇴</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              검색
            </button>
            <Link
              href="/admin/members"
              className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/40"
            >
              초기화
            </Link>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title={`회원 목록 (${list.total}명 중 ${list.items.length}명)`}
        headingId="member-list"
      >
        <MaskedHint />
        <AdminTableScroll>
          <table className={`${ADMIN_TABLE_CLASS} mt-3`}>
            <caption className="sr-only">회원 목록</caption>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  아이디
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  이름
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  이메일
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  연락처
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  권한
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  상태
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  가입일
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  상태 변경
                </th>
              </tr>
            </thead>
            <tbody>
              {list.items.length === 0 ? (
                <AdminEmptyRow colSpan={8} label="조건에 맞는 회원이 없습니다." />
              ) : (
                list.items.map((member) => (
                  <tr key={member.id}>
                    <th scope="row" className={`${ADMIN_TD_CLASS} font-bold`}>
                      {member.loginId}
                    </th>
                    <td className={ADMIN_TD_CLASS}>{member.maskedName}</td>
                    <td className={ADMIN_TD_CLASS}>{member.maskedEmail}</td>
                    <td className={ADMIN_TD_CLASS}>{member.maskedPhone}</td>
                    <td className={ADMIN_TD_CLASS}>
                      {member.role === "ADMIN" ? "관리자" : "회원"}
                    </td>
                    <td className={ADMIN_TD_CLASS}>{STATUS_LABEL[member.status]}</td>
                    <td className={ADMIN_TD_CLASS}>
                      {formatDateTime(member.createdAt)}
                    </td>
                    <td className={ADMIN_TD_CLASS}>
                      <MemberStatusForm userId={member.id} status={member.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>

        {lastPage > 1 ? (
          <nav aria-label="회원 목록 페이지 이동" className="mt-4 flex flex-wrap gap-2">
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
        title="관리자 계정"
        headingId="admin-accounts"
        description="역할 구분은 없습니다. 관리자는 모두 같은 권한을 가집니다. (D5)"
      >
        <AuditNotice>
          관리자 계정 추가·삭제는 누가 언제 했는지 기록에 남습니다. 관리자가 한 명만
          남았을 때는 삭제할 수 없고, 자기 계정도 삭제할 수 없습니다.
        </AuditNotice>

        <AdminTableScroll>
          <table className={`${ADMIN_TABLE_CLASS} mt-3`}>
            <caption className="sr-only">관리자 계정 목록</caption>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  아이디
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  이름
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  이메일
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  상태
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {adminAccounts.length === 0 ? (
                <AdminEmptyRow colSpan={5} label="관리자 계정이 없습니다." />
              ) : (
                adminAccounts.map((account) => (
                  <tr key={account.id}>
                    <th scope="row" className={`${ADMIN_TD_CLASS} font-bold`}>
                      {account.loginId}
                    </th>
                    <td className={ADMIN_TD_CLASS}>{account.maskedName}</td>
                    <td className={ADMIN_TD_CLASS}>{account.maskedEmail}</td>
                    <td className={ADMIN_TD_CLASS}>{STATUS_LABEL[account.status]}</td>
                    <td className={ADMIN_TD_CLASS}>
                      <AdminAccountDeleteButton
                        userId={account.id}
                        loginId={account.loginId}
                        isSelf={currentAdmin?.id === account.id}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>

        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm font-bold text-ink">관리자 계정 추가</h3>
          <div className="mt-3">
            <AdminAccountCreateForm />
          </div>
        </div>
      </AdminPanel>
    </>
  );
}

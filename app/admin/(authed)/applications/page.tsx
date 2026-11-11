import Link from "next/link";
import { ApplicationsTable } from "@/components/admin/applications-panels";
import {
  AdminPageHeading,
  AdminPanel,
  AuditNotice,
  MaskedHint,
} from "@/components/admin/ui";
import {
  ELEMENTARY_GRADES,
  applicationFilterSchema,
  type ApplicationFilterInput,
} from "@/lib/contracts";
import { listApplications } from "@/server/services/applications-admin";
import { listAdminCourses, listCampuses } from "@/server/services/courses";
import { listPublicEvents } from "@/server/services/events";

/**
 * AD-008 강좌 신청 목록 (설명회 예약 목록도 같은 화면에서 본다).
 *
 * 이름·연락처는 서버가 가린 값만 돌려준다. 원문은 건별 「원문 보기」로만 볼 수 있고
 * 그 조회와 CSV 내보내기는 모두 기록에 남는다. (AD-013, BLUEPRINT 10장)
 * 필터는 공유 계약의 `applicationFilterSchema` 를 그대로 쓴다.
 */
export const instant = false;

/** 필터 선택 상자를 채우기 위해 한 번에 읽는 강좌 수. 계약상 상한이 100이다. */
const OPTION_PAGE_SIZE = 100;

type ApplicationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pick(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "" ? undefined : first;
}

/** CSV 내보내기 주소. 페이지 범위가 아니라 **필터 결과 전체**를 내보낸다. (ASM-006) */
function exportHref(filter: ApplicationFilterInput): string {
  const params = new URLSearchParams({ kind: filter.kind });
  if (filter.campusId) params.set("campusId", filter.campusId);
  if (filter.courseId) params.set("courseId", filter.courseId);
  if (filter.eventId) params.set("eventId", filter.eventId);
  if (filter.status) params.set("status", filter.status);
  if (filter.grade) params.set("grade", filter.grade);
  if (filter.from) params.set("from", filter.from.toISOString());
  if (filter.to) params.set("to", filter.to.toISOString());
  return `/api/admin/applications/export?${params.toString()}`;
}

function pageHref(filter: ApplicationFilterInput, page: number): string {
  const params = new URLSearchParams({ kind: filter.kind });
  if (filter.campusId) params.set("campusId", filter.campusId);
  if (filter.courseId) params.set("courseId", filter.courseId);
  if (filter.eventId) params.set("eventId", filter.eventId);
  if (filter.status) params.set("status", filter.status);
  if (filter.grade) params.set("grade", filter.grade);
  if (page > 1) params.set("page", String(page));
  return `/admin/applications?${params.toString()}`;
}

export default async function AdminApplicationsPage({
  searchParams,
}: ApplicationsPageProps) {
  const raw = await searchParams;
  const candidate: Record<string, string> = {};
  for (const key of [
    "kind",
    "campusId",
    "courseId",
    "eventId",
    "status",
    "grade",
    "from",
    "to",
    "page",
  ]) {
    const value = pick(raw[key]);
    if (value !== undefined) {
      candidate[key] = value;
    }
  }

  const parsed = applicationFilterSchema.safeParse(candidate);
  const filter: ApplicationFilterInput = parsed.success
    ? parsed.data
    : applicationFilterSchema.parse({});

  const [list, campuses, courses, events] = await Promise.all([
    listApplications(filter),
    listCampuses(),
    listAdminCourses({ page: 1, pageSize: OPTION_PAGE_SIZE }),
    listPublicEvents({}),
  ]);

  const lastPage = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <>
      <AdminPageHeading
        featureId="AD-008"
        title="신청 목록"
        description="강좌 수강 신청과 설명회 예약을 조건별로 봅니다. 기본으로 이름·연락처를 가려서 보여 줍니다."
      >
        <a
          href={exportHref(filter)}
          className="rounded-md border border-accent/60 bg-accent/10 px-3 py-2 text-sm font-bold text-ink hover:bg-accent/20"
        >
          현재 조건 전체 CSV 내려받기
        </a>
      </AdminPageHeading>

      <AdminPanel title="보기 조건" headingId="application-filter">
        <form
          method="get"
          action="/admin/applications"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label htmlFor="app-kind" className="block text-xs font-bold text-ink">
              구분
            </label>
            <select
              id="app-kind"
              name="kind"
              defaultValue={filter.kind}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="course">강좌 수강 신청</option>
              <option value="event">설명회 예약</option>
            </select>
          </div>
          <div>
            <label htmlFor="app-campus" className="block text-xs font-bold text-ink">
              지점
            </label>
            <select
              id="app-campus"
              name="campusId"
              defaultValue={filter.campusId ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="app-course" className="block text-xs font-bold text-ink">
              강좌 (강좌 신청에만 적용)
            </label>
            <select
              id="app-course"
              name="courseId"
              defaultValue={filter.courseId ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              {courses.items.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.campusName} · {course.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="app-event" className="block text-xs font-bold text-ink">
              설명회 (설명회 예약에만 적용)
            </label>
            <select
              id="app-event"
              name="eventId"
              defaultValue={filter.eventId ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.managementCode} · {event.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="app-status" className="block text-xs font-bold text-ink">
              상태
            </label>
            <select
              id="app-status"
              name="status"
              defaultValue={filter.status ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              <option value="PENDING">접수</option>
              <option value="CONFIRMED">확정</option>
              <option value="CANCELLED">취소</option>
            </select>
          </div>
          <div>
            <label htmlFor="app-grade" className="block text-xs font-bold text-ink">
              학년
            </label>
            <select
              id="app-grade"
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
            <label htmlFor="app-from" className="block text-xs font-bold text-ink">
              신청일 시작
            </label>
            <input
              id="app-from"
              name="from"
              type="date"
              defaultValue={filter.from ? filter.from.toISOString().slice(0, 10) : ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="app-to" className="block text-xs font-bold text-ink">
              신청일 끝
            </label>
            <input
              id="app-to"
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
              적용
            </button>
            <Link
              href="/admin/applications"
              className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/40"
            >
              초기화
            </Link>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title={`${filter.kind === "course" ? "강좌 수강 신청" : "설명회 예약"} (${list.total}건 중 ${list.items.length}건)`}
        headingId="application-list"
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
          <ApplicationsTable kind={filter.kind} rows={list.items} />
        </div>

        {lastPage > 1 ? (
          <nav aria-label="신청 목록 페이지 이동" className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: lastPage }, (_, index) => index + 1).map((number) => (
              <Link
                key={number}
                href={pageHref(filter, number)}
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

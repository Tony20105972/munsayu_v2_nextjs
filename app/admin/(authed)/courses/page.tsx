import Link from "next/link";
import {
  CourseCreateForm,
  CourseDeleteButton,
  CourseEditForm,
  CourseIntakeForm,
} from "@/components/admin/courses-panels";
import {
  ADMIN_TABLE_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminEmptyRow,
  AdminPageHeading,
  AdminPanel,
  AdminTableScroll,
} from "@/components/admin/ui";
import { adminCourseListSchema } from "@/lib/contracts";
import { formatCourseStartDate, toDateInputValue } from "@/lib/view-models";
import { listAdminCourses, listCampuses } from "@/server/services/courses";

/**
 * AD-007 시간표·강좌 관리.
 *
 * 레거시 목록 칸 구성(EV-ADM-05): 출력순서, 구분 섹션, 학년 대분류, 강좌 제목,
 * 강의시간·개강일, 신청현황(n건, 링크), 관리.
 * 접수 상태는 접수중/접수마감 두 가지뿐이고 관리자가 직접 바꾼다. (Q-ADM-05)
 */
export const instant = false;

type CoursesPageProps = {
  searchParams: Promise<{ campusId?: string; intakeOpen?: string; page?: string }>;
};

export default async function AdminCoursesPage({ searchParams }: CoursesPageProps) {
  const raw = await searchParams;
  const parsed = adminCourseListSchema.safeParse({
    ...(raw.campusId ? { campusId: raw.campusId } : {}),
    ...(raw.intakeOpen === "true" || raw.intakeOpen === "false"
      ? { intakeOpen: raw.intakeOpen }
      : {}),
    ...(raw.page ? { page: raw.page } : {}),
  });
  const filter = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 20, campusId: undefined, intakeOpen: undefined };

  const [campuses, list] = await Promise.all([
    listCampuses(),
    listAdminCourses(filter),
  ]);

  const campusOptions = campuses.map((campus) => ({
    value: campus.id,
    label: campus.name,
  }));
  const lastPage = Math.max(1, Math.ceil(list.total / (filter.pageSize ?? 20)));

  function pageHref(page: number): string {
    const params = new URLSearchParams();
    if (filter.campusId) params.set("campusId", filter.campusId);
    if (filter.intakeOpen !== undefined) {
      params.set("intakeOpen", String(filter.intakeOpen));
    }
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/admin/courses?${query}` : "/admin/courses";
  }

  return (
    <>
      <AdminPageHeading
        featureId="AD-007"
        title="시간표·강좌 관리"
        description="지점별 강좌를 등록하고 공개 시간표에 보이는 순서와 접수 상태를 정합니다."
      />

      <AdminPanel title="보기 조건" headingId="course-filter">
        <form method="get" action="/admin/courses" className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="course-campus" className="block text-xs font-bold text-ink">
              지점
            </label>
            <select
              id="course-campus"
              name="campusId"
              defaultValue={filter.campusId ?? ""}
              className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
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
            <label htmlFor="course-intake" className="block text-xs font-bold text-ink">
              접수 상태
            </label>
            <select
              id="course-intake"
              name="intakeOpen"
              defaultValue={
                filter.intakeOpen === undefined ? "" : String(filter.intakeOpen)
              }
              className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              <option value="true">접수중</option>
              <option value="false">접수마감</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              적용
            </button>
            <Link
              href="/admin/courses"
              className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/40"
            >
              초기화
            </Link>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title={`강좌 목록 (${list.total}개 중 ${list.items.length}개)`}
        headingId="course-list"
      >
        <AdminTableScroll>
          <table className={ADMIN_TABLE_CLASS}>
            <caption className="sr-only">강좌 목록</caption>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  출력 순서
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  지점
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  구분
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  학년
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  강좌 제목
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  강의시간
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  개강일
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  접수 상태
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  신청현황
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {list.items.length === 0 ? (
                <AdminEmptyRow colSpan={10} label="조건에 맞는 강좌가 없습니다." />
              ) : (
                list.items.map((course) => (
                  <tr key={course.id}>
                    <td className={ADMIN_TD_CLASS}>{course.displayOrder}</td>
                    <td className={ADMIN_TD_CLASS}>{course.campusName}</td>
                    <td className={ADMIN_TD_CLASS}>{course.sectionTitle ?? "-"}</td>
                    <td className={ADMIN_TD_CLASS}>{course.gradeTitle ?? "-"}</td>
                    <th scope="row" className={`${ADMIN_TD_CLASS} font-bold`}>
                      {course.title}
                    </th>
                    <td className={ADMIN_TD_CLASS}>{course.scheduleText ?? "-"}</td>
                    <td className={ADMIN_TD_CLASS}>
                      {formatCourseStartDate(course.startDate)}
                    </td>
                    <td className={ADMIN_TD_CLASS}>
                      <CourseIntakeForm
                        courseId={course.id}
                        intakeOpen={course.intakeOpen}
                      />
                    </td>
                    <td className={ADMIN_TD_CLASS}>
                      <Link
                        href={`/admin/applications?kind=course&courseId=${course.id}`}
                        className="font-bold text-brand hover:underline"
                      >
                        {course.applicationCount}건
                      </Link>
                    </td>
                    <td className={ADMIN_TD_CLASS}>
                      <details>
                        <summary className="cursor-pointer text-xs font-bold text-brand">
                          수정
                        </summary>
                        <div className="mt-3 w-72 space-y-3 rounded-md border border-line bg-canvas p-3 sm:w-[32rem]">
                          <CourseEditForm
                            courseId={course.id}
                            campusOptions={campusOptions}
                            defaults={{
                              campusId: course.campusId,
                              title: course.title,
                              sectionTitle: course.sectionTitle,
                              gradeTitle: course.gradeTitle,
                              scheduleText: course.scheduleText,
                              startDate: toDateInputValue(course.startDate),
                              displayOrder: course.displayOrder,
                              intakeOpen: course.intakeOpen,
                            }}
                          />
                          <CourseDeleteButton
                            courseId={course.id}
                            title={course.title}
                            applicationCount={course.applicationCount}
                          />
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>

        {lastPage > 1 ? (
          <nav aria-label="강좌 목록 페이지 이동" className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: lastPage }, (_, index) => index + 1).map((number) => (
              <Link
                key={number}
                href={pageHref(number)}
                aria-current={number === (filter.page ?? 1) ? "page" : undefined}
                className={
                  number === (filter.page ?? 1)
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

      <AdminPanel title="강좌 추가" headingId="course-create">
        <CourseCreateForm
          campusOptions={campusOptions}
          defaults={{
            campusId: filter.campusId ?? "",
            title: "",
            sectionTitle: "정규강좌",
            gradeTitle: "",
            scheduleText: "",
            startDate: "",
            displayOrder: list.total + 1,
            intakeOpen: true,
          }}
        />
      </AdminPanel>
    </>
  );
}

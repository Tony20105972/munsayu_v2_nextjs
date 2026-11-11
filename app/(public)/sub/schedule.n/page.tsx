import { Timetable } from "@/components/public/timetable";
import { CampusLinkTabs } from "@/components/ui/campus-link-tabs";
import { PageBanner } from "@/components/ui/page-banner";
import { groupCoursesByGrade, listCoursesByCampusStub } from "@/lib/data/stubs";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * PG-008 대치본원 시간표 + FM-001 수강 예약.
 * 근거: docs/evidence/dom/phase1-course.yml, phase1-course-reservation-dialog.yml (EV-0006)
 */
export const metadata = buildPageMetadata({
  title: pageTitle("대치본원 시간표"),
  description:
    "스스로 질문하고 독해하는 힘! 문사유 대치동 프리미엄 초등 커리큘럼을 확인하세요.",
  path: "/sub/schedule.n",
});

export default function DaechiTimetablePage() {
  const groups = groupCoursesByGrade(listCoursesByCampusStub("daechi"));

  return (
    <>
      <PageBanner
        title="초등 문해력 수강신청 시간표"
        description="스스로 질문하고 독해하는 힘! 문사유 대치동 프리미엄 초등 커리큘럼을 확인하세요."
      />
      <CampusLinkTabs activeCampusId="daechi" label="시간표 지점 선택" />
      <Timetable groups={groups} />
    </>
  );
}

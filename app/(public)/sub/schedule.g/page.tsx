import { Timetable } from "@/components/public/timetable";
import { CampusLinkTabs } from "@/components/ui/campus-link-tabs";
import { PageBanner } from "@/components/ui/page-banner";
import { groupCoursesByGrade, listCoursesByCampusStub } from "@/lib/data/stubs";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * PG-009 분당점 시간표 + FM-001 수강 예약.
 * 근거: docs/evidence/dom/phase1-schedule-g.yml (EV-0009)
 */
export const metadata = buildPageMetadata({
  title: pageTitle("분당점 시간표"),
  description: "스스로 질문하고 독해하는 힘! 문사유 분당점 초등 커리큘럼을 확인하세요.",
  path: "/sub/schedule.g",
});

export default function BundangTimetablePage() {
  const groups = groupCoursesByGrade(listCoursesByCampusStub("bundang"));

  return (
    <>
      <PageBanner
        title="초등 문해력 수강신청 시간표"
        description="스스로 질문하고 독해하는 힘! 문사유 분당점 초등 커리큘럼을 확인하세요."
      />
      <CampusLinkTabs activeCampusId="bundang" label="시간표 지점 선택" />
      <Timetable groups={groups} />
    </>
  );
}

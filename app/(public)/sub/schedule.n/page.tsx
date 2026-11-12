import { Suspense } from "react";
import { Timetable } from "@/components/public/timetable";
import { CampusLinkTabs } from "@/components/ui/campus-link-tabs";
import { LoadingBlock } from "@/components/ui/loading-block";
import { PageBanner } from "@/components/ui/page-banner";
import { loadRetentionPolicies, loadTimetable } from "@/lib/data/public-content";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * PG-008 대치본원 시간표 + FM-001 수강 예약.
 * 근거: docs/evidence/dom/phase1-course.yml, phase1-course-reservation-dialog.yml (EV-0006)
 * 강좌 자료는 `src/server/services/courses` 를 Server Component 에서 직접 읽는다.
 */
export const metadata = buildPageMetadata({
  title: pageTitle("대치본원 시간표"),
  description:
    "스스로 질문하고 독해하는 힘! 문사유 대치동 프리미엄 초등 커리큘럼을 확인하세요.",
  path: "/sub/schedule.n",
});

async function DaechiTimetable() {
  const [groups, retention] = await Promise.all([
    loadTimetable("대치본원"),
    loadRetentionPolicies(),
  ]);
  return <Timetable groups={groups} retentionPolicy={retention.course} />;
}

export default function DaechiTimetablePage() {
  return (
    <>
      <PageBanner
        title="초등 문해력 수강신청 시간표"
        description="스스로 질문하고 독해하는 힘! 문사유 대치동 프리미엄 초등 커리큘럼을 확인하세요."
      />
      <CampusLinkTabs activeCampusId="daechi" label="시간표 지점 선택" />
      <Suspense fallback={<LoadingBlock label="시간표를 불러오고 있습니다." />}>
        <DaechiTimetable />
      </Suspense>
    </>
  );
}

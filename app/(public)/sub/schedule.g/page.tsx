import { Suspense } from "react";
import { Timetable } from "@/components/public/timetable";
import { CampusLinkTabs } from "@/components/ui/campus-link-tabs";
import { LoadingBlock } from "@/components/ui/loading-block";
import { PageBanner } from "@/components/ui/page-banner";
import { loadRetentionPolicies, loadTimetable } from "@/lib/data/public-content";
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

async function BundangTimetable() {
  const [groups, retention] = await Promise.all([
    loadTimetable("분당점"),
    loadRetentionPolicies(),
  ]);
  return <Timetable groups={groups} retentionPolicy={retention.course} />;
}

export default function BundangTimetablePage() {
  return (
    <>
      <PageBanner
        title="초등 문해력 수강신청 시간표"
        description="스스로 질문하고 독해하는 힘! 문사유 분당점 초등 커리큘럼을 확인하세요."
      />
      <CampusLinkTabs activeCampusId="bundang" label="시간표 지점 선택" />
      <Suspense fallback={<LoadingBlock label="시간표를 불러오고 있습니다." />}>
        <BundangTimetable />
      </Suspense>
    </>
  );
}

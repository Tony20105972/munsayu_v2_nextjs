import { Suspense } from "react";
import { InstructorList } from "@/components/public/instructor-list";
import { LoadingBlock } from "@/components/ui/loading-block";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { loadInstructors } from "@/lib/data/public-content";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * PG-005 강사진 안내.
 * 근거: docs/evidence/dom/phase1-teachers.yml — 배너 문구, 머리글, 강사 약력 구성.
 * 강사 자료는 `src/server/services/instructors` 를 Server Component 에서 직접 읽는다. (AD-006)
 */
export const metadata = buildPageMetadata({
  title: pageTitle("강사진 안내"),
  description: "문사유 학원 대표강사 라인업과 약력을 안내합니다.",
  path: "/sub/abouttch1",
});

async function AllInstructors() {
  return <InstructorList instructors={await loadInstructors()} />;
}

export default function InstructorsPage() {
  return (
    <>
      <PageBanner
        title="강사진 안내"
        description="대치동 최정예 대표강사 라인업 - 강사 카드에서 바로 수강 예약 화면으로 이동할 수 있습니다."
      />
      <Section
        eyebrow="PRO 강사진"
        title="문사유 학원 대표강사 라인업"
        description="수강 예약하기를 누르면 실시간 수강 예약 화면으로 연결됩니다."
      >
        <Suspense fallback={<LoadingBlock label="강사 정보를 불러오고 있습니다." />}>
          <AllInstructors />
        </Suspense>
      </Section>
    </>
  );
}

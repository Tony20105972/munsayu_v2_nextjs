import { InstructorList } from "@/components/public/instructor-list";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { listInstructorsStub } from "@/lib/data/stubs";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * PG-005 강사진 안내.
 * 근거: docs/evidence/dom/phase1-teachers.yml — 배너 문구, 머리글, 강사 13명의 이름·약력.
 */
export const metadata = buildPageMetadata({
  title: pageTitle("강사진 안내"),
  description: "문사유 학원 대표강사 라인업과 약력을 안내합니다.",
  path: "/sub/abouttch1",
});

export default function InstructorsPage() {
  const instructors = listInstructorsStub();

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
        <InstructorList instructors={instructors} />
      </Section>
    </>
  );
}

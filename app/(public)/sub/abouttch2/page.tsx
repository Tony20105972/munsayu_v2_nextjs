import Link from "next/link";
import { Suspense } from "react";
import { InstructorList } from "@/components/public/instructor-list";
import { LoadingBlock } from "@/components/ui/loading-block";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { loadBundangInstructors } from "@/lib/data/public-content";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * PG-006 분당점 강사진.
 * 레거시 `/sub/abouttch2` 의 내용은 관찰하지 못했다(메뉴 링크만 확인, EV-0003).
 * 경로를 유지해야 하므로 강사진 안내의 분당점 보기로 구성했다. // ASM-043
 */
export const metadata = buildPageMetadata({
  title: pageTitle("분당점 강사진"),
  description: "문해와 사유 분당점에서 수업하는 강사진을 안내합니다.",
  path: "/sub/abouttch2",
});

async function BundangInstructors() {
  return <InstructorList instructors={await loadBundangInstructors()} />;
}

export default function BundangInstructorsPage() {
  return (
    <>
      <PageBanner
        title="분당점 강사진"
        description="문해와 사유 분당점에서 수업하는 강사진을 안내합니다."
      />
      <Section
        eyebrow="BUNDANG"
        title="분당점 강사진"
        description="전체 강사 명단은 강사진 안내 화면에서 확인할 수 있습니다."
      >
        <Suspense fallback={<LoadingBlock label="강사 정보를 불러오고 있습니다." />}>
          <BundangInstructors />
        </Suspense>
        <p className="mt-8 text-center">
          <Link
            href="/sub/abouttch1"
            className="text-sm font-bold text-brand hover:underline"
          >
            전체 강사진 보기
          </Link>
        </p>
      </Section>
    </>
  );
}

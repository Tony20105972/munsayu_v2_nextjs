import { DiagnosisSection } from "@/components/public/diagnosis-section";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * PG-007 문해력 진단 안내.
 * 레거시 `/sub/abouttch3` 의 내용은 관찰하지 못했지만, 홈의 `문해력 진단 신청` 카드가
 * 이 경로를 가리켰다(phase1-home.yml). 그래서 진단 안내 화면으로 구성했다. // ASM-043
 * 신청 자체는 외부 Google Forms 링크를 그대로 쓴다. (RT-003, AD-009)
 */
export const metadata = buildPageMetadata({
  title: pageTitle("문해력 진단 안내"),
  description:
    "어휘·독해·추론·글쓰기를 살펴 강점과 보완할 부분을 확인하는 문해력 진단을 안내합니다.",
  path: "/sub/abouttch3",
});

export default function LiteracyDiagnosisPage() {
  return (
    <>
      <PageBanner
        title="문해력 진단 안내"
        description="진단 결과를 바탕으로 아이에게 필요한 학습 방향을 안내합니다."
      />
      <DiagnosisSection />
    </>
  );
}

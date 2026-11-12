import { connection } from "next/server";
import { Suspense } from "react";
import { DiagnosisSection } from "@/components/public/diagnosis-section";
import { LoadingBlock } from "@/components/ui/loading-block";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";
import { getSiteSettings } from "@/server/services/settings";

/**
 * PG-007 문해력 진단 안내.
 * 레거시 `/sub/abouttch3` 의 내용은 관찰하지 못했지만, 홈의 `문해력 진단 신청` 카드가
 * 이 경로를 가리켰다(phase1-home.yml). 그래서 진단 안내 화면으로 구성했다. // ASM-043
 * 신청 자체는 사이트 안에 폼을 두지 않고 관리자가 등록한 구글 폼 주소로 보낸다.
 * (RT-003, AD-009, 사용자 결정 2026-11-12) // ASM-082
 */
export const metadata = buildPageMetadata({
  title: pageTitle("문해력 진단 안내"),
  description:
    "어휘·독해·추론·글쓰기를 살펴 강점과 보완할 부분을 확인하는 문해력 진단을 안내합니다.",
  path: "/sub/abouttch3",
});

async function DiagnosisBody() {
  // 관리자가 바꾼 주소가 바로 반영되도록 요청 시점 렌더임을 알린다. (cacheComponents)
  await connection();
  const settings = await getSiteSettings();
  return <DiagnosisSection diagnosisUrl={settings.diagnosisCtaExternalUrl} />;
}

export default function LiteracyDiagnosisPage() {
  return (
    <>
      <PageBanner
        title="문해력 진단 안내"
        description="진단 결과를 바탕으로 아이에게 필요한 학습 방향을 안내합니다."
      />
      <Suspense fallback={<LoadingBlock label="진단 안내를 불러오는 중입니다." />}>
        <DiagnosisBody />
      </Suspense>
    </>
  );
}

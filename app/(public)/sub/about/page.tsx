import { HomeCosmo } from "@/components/home/cosmo";
import { AboutIntro } from "@/components/public/about-intro";
import { DiagnosisSection } from "@/components/public/diagnosis-section";
import { PageBanner } from "@/components/ui/page-banner";
import { Tabs } from "@/components/ui/tabs";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * PG-002 학원 소개.
 * 근거: docs/evidence/dom/phase1-about.yml — 배너 문구, 탭 3개, 1번 탭 본문 전체.
 * 2·3번 탭 본문은 레거시에서 관찰하지 못해 홈에서 관찰한 PROJECT COSMO·진단평가
 * 내용을 그대로 쓴다. // ASM-048
 */
export const metadata = buildPageMetadata({
  title: pageTitle("학원 소개"),
  description:
    "정확한 어휘에서 깊이 있는 독서로. 자신의 언어로 세상을 이해하는 힘을 기릅니다.",
  path: "/sub/about",
});

export default function AboutPage() {
  return (
    <>
      <PageBanner
        title="초등 문해력, 생각의 중심을 세우다."
        description="정확한 어휘에서 깊이 있는 독서로. 자신의 언어로 세상을 이해하는 힘을 기릅니다."
      />
      <Tabs
        label="학원 소개 항목"
        items={[
          {
            id: "overview",
            label: "1. 학원 소개 & 전체 시스템",
            panel: <AboutIntro />,
          },
          {
            id: "cosmo",
            label: "2. 초등 문해력 (PROJECT COSMO)",
            panel: <HomeCosmo />,
          },
          {
            id: "assessment",
            label: "3. 진단평가 & 입학상담",
            panel: <DiagnosisSection />,
          },
        ]}
      />
    </>
  );
}

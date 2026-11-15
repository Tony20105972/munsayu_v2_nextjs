import { HomeConsult, HomeEventNotice } from "@/components/home/contact";
import { HomeCosmo } from "@/components/home/cosmo";
import {
  HomeCharacteristics,
  HomeDifferentiators,
  HomeCurriculum,
  HomeLearningSystem,
  HomeQuestion,
} from "@/components/home/curriculum";
import { HomeHero, HomeQuickLinks } from "@/components/home/hero";
import { LoadingBlock } from "@/components/ui/loading-block";
import { loadHomeBanners, loadRetentionPolicies } from "@/lib/data/public-content";
import { DEFAULT_HOME_BANNERS } from "@/lib/images";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_TITLE_SUFFIX } from "@/lib/site-config";
import { connection } from "next/server";
import { Suspense } from "react";

/** PG-001 홈. 관찰 근거: docs/evidence/dom/phase1-home.yml (EV-0003) */
export const metadata = buildPageMetadata({
  title: SITE_TITLE_SUFFIX,
  description:
    "어휘·독해·사고 토론·글쓰기를 하나의 흐름으로 연결합니다. 읽은 내용을 바탕으로 생각을 나누고, 근거를 갖춘 글로 정리합니다.",
  path: "/",
});

/**
 * AD-010 알림 신청의 동의 안내는 관리자 보존 설정 문구를 그대로 보여 준다. (BZ-002)
 * 그 값은 DB 에서 읽으므로 Suspense 경계 안에서만 기다린다.
 */
/**
 * AD-015 메인 배너는 관리자가 고치므로 DB 에서 읽는다.
 * 기다리는 동안에는 코드 기본값으로 같은 자리를 그려 둬서 화면이 비거나 흔들리지 않게 한다.
 */
async function HeroSection() {
  await connection();
  return <HomeHero banners={await loadHomeBanners()} />;
}

async function EventNoticeSection() {
  // 보존 문구는 관리자가 바꿀 수 있다. 바뀌면 바로 반영돼야 한다. (BZ-002)
  await connection();
  const retention = await loadRetentionPolicies();
  return <HomeEventNotice retentionPolicy={retention.sms} />;
}

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<HomeHero banners={DEFAULT_HOME_BANNERS} />}>
        <HeroSection />
      </Suspense>
      <HomeQuickLinks />
      <HomeQuestion />
      <HomeCharacteristics />
      <HomeCurriculum />
      <HomeLearningSystem />
      <HomeDifferentiators />
      <HomeCosmo />
      <HomeConsult />
      <Suspense fallback={<LoadingBlock label="설명회 안내를 불러오는 중입니다." />}>
        <EventNoticeSection />
      </Suspense>
    </>
  );
}

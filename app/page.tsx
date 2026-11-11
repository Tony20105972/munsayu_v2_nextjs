import { HomeConsult, HomeEventNotice } from "@/components/home/contact";
import { HomeCosmo } from "@/components/home/cosmo";
import {
  HomeCharacteristics,
  HomeCurriculum,
  HomeLearningSystem,
  HomeQuestion,
} from "@/components/home/curriculum";
import { HomeHero, HomeQuickLinks } from "@/components/home/hero";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_TITLE_SUFFIX } from "@/lib/site-config";

/** PG-001 홈. 관찰 근거: docs/evidence/dom/phase1-home.yml (EV-0003) */
export const metadata = buildPageMetadata({
  title: SITE_TITLE_SUFFIX,
  description:
    "어휘·독해·사고 토론·글쓰기를 하나의 흐름으로 연결합니다. 읽은 내용을 바탕으로 생각을 나누고, 근거를 갖춘 글로 정리합니다.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeQuickLinks />
      <HomeQuestion />
      <HomeCharacteristics />
      <HomeCurriculum />
      <HomeLearningSystem />
      <HomeCosmo />
      <HomeConsult />
      <HomeEventNotice />
    </>
  );
}

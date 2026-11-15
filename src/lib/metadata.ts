import type { Metadata } from "next";
import { SITE_NAME, SITE_ORIGIN, SITE_TITLE_SUFFIX } from "@/lib/site-config";

type PageMetadataInput = {
  /** 완성된 전체 title. 홈을 뺀 공개 화면은 `pageTitle()` 을 쓴다. // ASM-095 */
  title: string;
  description: string;
  /** 신규 canonical 경로 */
  path: string;
  /** 개인정보가 오가는 화면은 색인에서 뺀다. 지정하지 않으면 Next 기본값(색인 허용)이다. */
  noIndex?: boolean;
};

/**
 * 링크 공유용 대표 이미지. `app/opengraph-image.png` 파일 규칙으로 서비스되지만,
 * 페이지가 `openGraph` 를 직접 정의하면 파일 규칙이 자동으로 붙지 않으므로 여기서 명시한다.
 */
const OPEN_GRAPH_IMAGE = {
  url: "/opengraph-image.png",
  width: 3001,
  height: 3001,
  alt: `${SITE_NAME} 로고`,
} as const;

/**
 * 모든 유지 경로의 title·description·canonical·OG를 같은 규칙으로 만든다. (BLUEPRINT 8장)
 *
 * **title 규칙** (Phase 5 전수 관찰 뒤 확정 — ASM-095, docs/legacy/legacy-seo-map.md)
 * - 레거시는 `/` 와 `/sub/*` 11개가 **모두 같은** title(`문해와 사유(초등독서논술학원)`)
 *   이었다. 그대로 옮기면 11개 화면이 검색 결과에서 구분되지 않는다.
 * - 그래서 홈만 접미사 하나를 쓰고, 나머지 공개 화면은 `<페이지 이름> | 접미사` 를 쓴다.
 * - 그누보드 화면(`/bbs/*`)은 레거시에도 페이지별 title 이 있었고 그 값을 그대로 쓴다.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const url = new URL(path, SITE_ORIGIN).toString();

  return {
    title,
    description,
    alternates: { canonical: path },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "ko_KR",
      title,
      description,
      url,
      images: [OPEN_GRAPH_IMAGE],
    },
  };
}

/** 공개 화면 title 접미사 규칙. 홈만 예외로 접미사 하나를 쓴다. // ASM-095 */
export function pageTitle(name: string): string {
  return `${name} | ${SITE_TITLE_SUFFIX}`;
}

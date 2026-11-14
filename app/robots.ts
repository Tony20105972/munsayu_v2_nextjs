import type { MetadataRoute } from "next";

/**
 * `/robots.txt`.
 *
 * 레거시도 robots.txt 를 두고 `/uAdmin/` 만 막고 있었다(EV-0002). 신규 앱에는 파일이
 * 없어 404 였다 — Phase 5 동등성 검증에서 찾았다. (EV-0015)
 *
 * 막는 경로:
 * - `/admin`·`/api` — 관리자 화면과 내부 API. 크롤러가 긁을 이유가 없다.
 * - `/uploads` — 관리자가 올린 원본 파일 경로.
 * - `/account` — 회원 개인 화면.
 * - `/uAdmin/`·`/adm/` — 레거시 관리자 경로. 신규는 410 을 돌려주지만(RT-004)
 *   레거시 robots.txt 와 같은 줄을 남겨 둔다.
 *
 * 막는 것은 색인 요청일 뿐 접근 제어가 아니다. 권한은 서버에서 매 요청 확인한다.
 * (CLAUDE.md 4장)
 *
 * sitemap 은 적지 않는다. 레거시도 `/sitemap.xml` 이 404 였다(EV-0004). 신규에도 없다.
 * (제안: 공개 경로가 14개뿐이라 `app/sitemap.ts` 를 두면 색인에 도움이 된다 — 범위 밖)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/admin", "/api", "/uploads", "/account", "/uAdmin/", "/adm/"],
    },
  };
}

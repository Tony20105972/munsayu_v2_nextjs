import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site-config";

/**
 * `/sitemap.xml`.
 *
 * 레거시는 `/sitemap.xml` 이 404 였다(EV-0004). 신규도 없어 Phase 5 때 「범위 밖」으로
 * 남겨 두었는데, Phase 6 검색 항목에서 넣기로 했다. 공개 경로가 14개뿐이라 손으로
 * 적어도 관리가 어렵지 않고, 메뉴에서 꺼져 있는 화면도 색인에 올릴 수 있다.
 *
 * **넣지 않는 것** — 관리자·회원 개인 화면과 내부 API 는 색인 대상이 아니다.
 * `app/robots.ts` 에서 막는 경로와 같은 기준이다.
 * - `/admin/**` 관리자, `/account/**` 회원 개인, `/api/**` 내부, `/uploads/**` 올린 파일
 * - `/sub/Recruit` — 관리자가 켜기 전에는 메뉴에 없고 `noindex` 다. // ASM-088
 * - `/notice/{id}` 글 상세 — 글이 바뀌면 목록이 알려 주므로 목록만 올린다.
 *
 * 공지 상세까지 넣으려면 DB 를 읽어야 하는데, sitemap 생성이 DB 상태에 묶이면
 * DB 가 느릴 때 색인까지 흔들린다. 목록 한 줄로 충분하다.
 */
const PUBLIC_PATHS = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/sub/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/sub/Location", priority: 0.6, changeFrequency: "yearly" },
  { path: "/sub/Facility", priority: 0.6, changeFrequency: "yearly" },
  { path: "/sub/abouttch1", priority: 0.7, changeFrequency: "monthly" },
  { path: "/sub/abouttch2", priority: 0.7, changeFrequency: "monthly" },
  { path: "/sub/abouttch3", priority: 0.7, changeFrequency: "monthly" },
  { path: "/sub/schedule.n", priority: 0.9, changeFrequency: "weekly" },
  { path: "/sub/schedule.g", priority: 0.9, changeFrequency: "weekly" },
  { path: "/sub/Presentation", priority: 0.9, changeFrequency: "weekly" },
  { path: "/sub/Check", priority: 0.5, changeFrequency: "yearly" },
  { path: "/notice", priority: 0.7, changeFrequency: "weekly" },
  { path: "/login", priority: 0.3, changeFrequency: "yearly" },
  { path: "/register", priority: 0.3, changeFrequency: "yearly" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  // 빌드 시각을 쓰면 배포마다 모든 줄이 바뀐 것처럼 보인다. 날짜만 쓴다.
  const lastModified = new Date();

  return PUBLIC_PATHS.map((entry) => ({
    url: new URL(entry.path, SITE_ORIGIN).toString(),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}

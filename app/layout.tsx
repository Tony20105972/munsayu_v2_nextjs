import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_ORIGIN, SITE_TITLE_SUFFIX } from "@/lib/site-config";
import "./globals.css";

/**
 * 최상위 레이아웃. `<html>`·`<body>` 와 기본 메타데이터만 둔다.
 *
 * 공개 화면의 헤더·푸터는 `app/(public)/layout.tsx` 에, 관리자 화면의 머리글·메뉴는
 * `app/admin/(authed)/layout.tsx` 에 있다. 두 영역이 서로 다른 화면 틀을 쓰기 때문이다.
 * 페이지별 title·description·canonical·OG 는 각 페이지의 metadata 가 덮어쓴다. (BLUEPRINT 8장)
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: SITE_TITLE_SUFFIX,
  description:
    "어휘·독해·사고 토론·글쓰기를 하나의 흐름으로 연결하는 초등 독서논술 학원입니다.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}

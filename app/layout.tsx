import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE_ORIGIN, SITE_TITLE_SUFFIX } from "@/lib/site-config";
import "./globals.css";

/**
 * 공통 레이아웃. 헤더·푸터는 레거시 관찰값(EV-0003, EV-0007)을 재현한다.
 * 페이지별 title·description·canonical·OG는 각 페이지의 metadata 가 덮어쓴다. (BLUEPRINT 8장)
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
      <body className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          본문으로 건너뛰기
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

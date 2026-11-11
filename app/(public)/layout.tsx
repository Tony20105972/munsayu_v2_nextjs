import type { ReactNode } from "react";
import { AnalyticsScript } from "@/components/layout/analytics-script";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * 공개 화면 레이아웃. 헤더·푸터는 레거시 관찰값(EV-0003, EV-0007)을 재현한다.
 * 방문 통계 스크립트는 분석 ID 환경 변수가 있을 때만 들어간다. (AD-012, ASM-004)
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
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
      <AnalyticsScript />
    </>
  );
}

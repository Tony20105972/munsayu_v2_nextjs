import type { ReactNode } from "react";
import { SUB_HERO_BACKGROUND } from "@/lib/images";

type PageBannerProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

/**
 * 레거시 서브 페이지 상단 배너(EV-0005, EV-0006, EV-0009) 재현.
 * 배경 사진은 레거시와 같이 CSS background 로 넣고, 글을 읽을 수 있도록 남색 덮개를
 * 겹친다. 모든 `/sub/*` 과 공지 화면이 같은 사진을 쓴다. (EV-0012)
 */
export function PageBanner({ title, description, children }: PageBannerProps) {
  return (
    <section
      className="relative isolate bg-banner-start bg-cover bg-center text-white"
      style={{ backgroundImage: `url(${SUB_HERO_BACKGROUND})` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-br from-banner-start/90 to-banner-end/80"
      />
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {description ? (
          <p className="mx-auto mt-5 max-w-3xl text-sm text-white/85 sm:text-base">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

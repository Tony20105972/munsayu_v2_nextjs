import type { ReactNode } from "react";

type PageBannerProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

/**
 * 레거시 서브 페이지 상단 배너(EV-0005, EV-0006, EV-0009) 재현.
 * 레거시는 사진 배경이지만 원본 이미지를 확보하지 못해 단색 그라데이션을 쓴다. // ASM-042
 */
export function PageBanner({ title, description, children }: PageBannerProps) {
  return (
    <section className="bg-linear-to-br from-banner-start to-banner-end text-white">
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

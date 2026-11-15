import Image from "next/image";
import type { ReactNode } from "react";
import { SUB_HERO_BACKGROUND } from "@/lib/images";

type PageBannerProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

/**
 * 레거시 서브 페이지 상단 배너(EV-0005, EV-0006, EV-0009) 재현.
 * 모든 `/sub/*` 과 공지 화면이 같은 사진을 쓴다. (EV-0012)
 *
 * 레거시는 CSS `background-image` 로 넣었고 Phase 3 도 그대로 따랐다. Phase 6 측정에서
 * **이 배너가 모든 하위 화면의 LCP 였다.** 원본이 1920x1280·267KB 인데 CSS 배경은
 * 화면 크기에 맞춰 줄여 주지 않아서 375px 휴대폰도 원본을 그대로 받았다. 느린 4G 에서
 * LCP 가 2.9~3.5초였다.
 *
 * 그래서 `next/image` 로 바꾼다. 화면 폭에 맞는 AVIF·WebP 를 내려주고 `priority` 로
 * 미리 불러온다. 보이는 모습은 같다(`object-cover` + 가운데 정렬 = `bg-cover bg-center`).
 * 사진 위에 80~90% 덮개가 깔려 사진은 분위기만 낸다. 그래서 품질을 낮춰도 티가 나지 않는다.
 */
export function PageBanner({ title, description, children }: PageBannerProps) {
  return (
    <section className="relative isolate bg-banner-start text-white">
      <Image
        src={SUB_HERO_BACKGROUND}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        quality={55}
        className="-z-20 object-cover object-center"
      />
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

import Link from "next/link";
import type { CSSProperties } from "react";
import { DEFAULT_HOME_BANNERS, type HomeBannerView } from "@/lib/images";

/**
 * 홈 히어로 배너. (PG-001, AD-015)
 *
 * 문구·버튼 주소의 출발점은 docs/evidence/dom/phase1-home.yml 관찰값이고, 지금은
 * 관리자가 「이미지 관리 → 메인 배너」에서 슬라이드마다 사진·제목·설명·버튼을 고친다.
 * 배너를 하나도 만들지 않았거나 DB 를 읽지 못하면 `DEFAULT_HOME_BANNERS`(Phase 3 문구
 * 그대로)로 그린다. 화면이 멈추는 일은 없다.
 *
 * 슬라이드는 한 칸(grid 1/1)에 겹쳐 두고 투명도만 바꿔 돌린다. 레거시도 CSS background
 * 슬라이드였다. (EV-0012) 움직임을 줄이도록 설정한 환경에서는 첫 장만 보인다.
 *
 * 보조기기에는 **첫 슬라이드만** 읽힌다. 자동으로 돌아가는 같은 성격의 홍보 문구를
 * 여러 번 읽어 주면 오히려 방해가 되기 때문이다. 꼭 전달할 안내는 첫 슬라이드에
 * 넣어야 한다. // ASM-092
 */

/** 슬라이드 한 장이 보이는 시간(초). 3장이면 한 바퀴 18초로 Phase 3 과 같다. */
const SLIDE_SECONDS = 6;

type SlideStyle = CSSProperties & {
  "--home-hero-cycle": string;
  "--home-hero-delay": string;
};

function SlideButtons({ banner }: { banner: HomeBannerView }) {
  const primary = banner.primaryLabel && banner.primaryHref;
  const secondary = banner.secondaryLabel && banner.secondaryHref;

  if (!primary && !secondary) return null;

  return (
    <div className="mt-9 flex flex-wrap gap-3">
      {primary ? (
        <Link
          href={banner.primaryHref}
          className="rounded-md bg-accent px-6 py-3 text-sm font-bold text-ink hover:bg-accent-soft"
        >
          {banner.primaryLabel}
        </Link>
      ) : null}
      {secondary ? (
        <Link
          href={banner.secondaryHref}
          className="rounded-md border border-white/60 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
        >
          {banner.secondaryLabel}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * 저장된 줄바꿈을 화면의 줄바꿈으로 보여 준다. 관리자가 넣은 값은 글자로만 쓰고
 * HTML 로 해석하지 않는다. Phase 3 가 쓰던 `<br />` 모양을 그대로 유지한다.
 */
function MultilineText({ value }: { value: string }) {
  const lines = value.split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <span key={`${index}-${line}`}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </>
  );
}

export function HomeHero({
  banners = DEFAULT_HOME_BANNERS,
}: {
  banners?: readonly HomeBannerView[];
}) {
  const slides = banners.length > 0 ? banners : DEFAULT_HOME_BANNERS;
  const cycleSeconds = slides.length * SLIDE_SECONDS;

  return (
    <section className="relative isolate overflow-hidden bg-banner-start text-white">
      <div className="grid">
        {slides.map((banner, index) => {
          const style: SlideStyle = {
            "--home-hero-cycle": `${cycleSeconds}s`,
            "--home-hero-delay": `${index * SLIDE_SECONDS}s`,
          };

          return (
            <div
              key={banner.id}
              style={style}
              /* 첫 장만 보조기기에 읽힌다. 나머지는 같은 자리에서 돌아가는 장식이다. // ASM-092 */
              aria-hidden={index > 0 ? "true" : undefined}
              className="home-hero-slide relative col-start-1 row-start-1"
            >
              {banner.backgroundUrl ? (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${banner.backgroundUrl})` }}
                />
              ) : null}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-br from-banner-start/90 to-banner-end/75"
              />

              <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
                {banner.eyebrow ? (
                  <p className="text-xs font-bold tracking-[0.35em] text-accent-soft">
                    {banner.eyebrow}
                  </p>
                ) : null}

                {/*
                  레거시는 제목을 h2로 썼지만 홈에 h1이 없어 접근성 기준에 맞춰 h1으로
                  올렸다. 둘째 장부터는 같은 제목이 겹치지 않도록 제목 태그를 쓰지 않는다. // ASM-046
                */}
                {index === 0 ? (
                  <h1 className="mt-6 max-w-3xl text-3xl font-bold leading-snug tracking-tight sm:text-5xl">
                    <MultilineText value={banner.headline} />
                  </h1>
                ) : (
                  <p className="mt-6 max-w-3xl text-3xl font-bold leading-snug tracking-tight sm:text-5xl">
                    <MultilineText value={banner.headline} />
                  </p>
                )}

                {banner.body ? (
                  <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                    <MultilineText value={banner.body} />
                  </p>
                ) : null}

                <SlideButtons banner={banner} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const QUICK_LINKS = [
  { label: "설명회 알림 신청", href: "/sub/Presentation" },
  { label: "수강 상담", href: "/sub/schedule.n" },
  { label: "강사진·교육 철학", href: "/sub/abouttch1" },
  { label: "오시는 길", href: "/sub/Location" },
] as const;

/** 히어로 아래 바로가기 카드 4개 (phase1-home.yml 관찰 순서 그대로). */
export function HomeQuickLinks() {
  return (
    <section aria-label="바로가기" className="bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-4">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="bg-surface px-4 py-8 text-center text-sm font-bold text-ink hover:bg-canvas"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

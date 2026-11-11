import Link from "next/link";

/**
 * 홈 히어로. 문구·버튼 주소는 docs/evidence/dom/phase1-home.yml 관찰값이다.
 * 레거시는 제목을 h2로 썼지만 홈에 h1이 없어 접근성 기준에 맞춰 h1으로 올렸다. // ASM-046
 */
export function HomeHero() {
  return (
    <section className="bg-linear-to-br from-banner-start to-banner-end text-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="text-xs font-bold tracking-[0.35em] text-accent-soft">
          ELEMENTARY LITERACY PROGRAM
        </p>
        <h1 className="mt-6 max-w-3xl text-3xl font-bold leading-snug tracking-tight sm:text-5xl">
          읽은 것을 이해하고,
          <br />
          자기 생각으로 표현하는 힘
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
          어휘·독해·사고 토론·글쓰기를 하나의 흐름으로 연결합니다.
          <br />
          읽은 내용을 바탕으로 생각을 나누고, 근거를 갖춘 글로 정리합니다.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/sub/about"
            className="rounded-md bg-accent px-6 py-3 text-sm font-bold text-ink hover:bg-accent-soft"
          >
            문해력 진단 신청
          </Link>
          <Link
            href="/sub/schedule.n"
            className="rounded-md border border-white/60 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            교육과정 알아보기
          </Link>
        </div>
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
            className="bg-surface px-4 py-8 text-center text-sm font-bold text-ink hover:bg-canvas hover:text-brand"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

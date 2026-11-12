import type { ReactNode } from "react";

type SectionProps = {
  /** 섹션 위의 영문 머리글. 레거시 관찰값이 있을 때만 넣는다. */
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  /** 제목 요소. 기본은 h2 이고 페이지 안의 위계에 맞춰 바꾼다. */
  headingLevel?: "h2" | "h3";
  tone?: "canvas" | "surface" | "ink";
  children: ReactNode;
};

const TONE_CLASS: Record<NonNullable<SectionProps["tone"]>, string> = {
  canvas: "bg-canvas text-ink",
  surface: "bg-surface text-ink",
  ink: "bg-ink text-white",
};

export function Section({
  eyebrow,
  title,
  description,
  headingLevel = "h2",
  tone = "canvas",
  children,
}: SectionProps) {
  const Heading = headingLevel;

  return (
    <section className={TONE_CLASS[tone]}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {eyebrow || title || description ? (
          <header className="mb-10 text-center">
            {eyebrow ? (
              <p className="text-xs font-bold tracking-[0.3em] text-accent">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <Heading className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                {title}
              </Heading>
            ) : null}
            {description ? (
              <div className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-muted">
                {description}
              </div>
            ) : null}
          </header>
        ) : null}
        {children}
      </div>
    </section>
  );
}

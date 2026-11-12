import Link from "next/link";
import { Section } from "@/components/ui/section";

/** 모든 문구는 docs/evidence/dom/phase1-home.yml 관찰값이다. */

const CHARACTERISTICS = [
  {
    title: "01 어휘 | 문맥 속에서 뜻을 이해합니다",
    body: "개념어와 학습 도구어의 뜻을 글 속에서 확인합니다. 비슷한 말과 반대말을 연결하며 알맞게 사용하는 연습을 합니다.",
  },
  {
    title: "02 독해 | 핵심과 구조를 읽습니다",
    body: "중요한 정보를 찾고 문단 사이의 관계를 살핍니다. 글의 흐름과 글쓴이의 의도를 근거를 들어 설명합니다.",
  },
  {
    title: "03 사고 | 질문하고 비교합니다",
    body: '"왜 그럴까?"를 묻고 서로 다른 관점을 비교합니다. 주장에 어떤 근거가 필요한지 살피며 자신의 판단을 정리합니다.',
  },
  {
    title: "04 토론 | 근거를 들어 설명합니다",
    body: "자신의 의견을 이유와 함께 말하고 다른 의견을 듣습니다. 질문과 반론을 통해 생각을 보완합니다.",
  },
  {
    title: "05 글쓰기 | 생각을 글로 완성합니다",
    body: "읽고 토론한 내용을 주장과 근거가 드러나도록 씁니다. 강사의 피드백을 바탕으로 내용과 표현을 고쳐 씁니다.",
  },
  {
    title: "모집 학년: 예비 초등 5·6학년",
    body: "초등 독서논술·문해력 통합 과정으로 중·고등 학습 능력과 서·논술 평가의 강력한 바탕을 완성합니다.",
  },
] as const;

const CURRICULUM = [
  {
    eyebrow: "Elementary Grade 5",
    title: "초5 | 읽은 내용을 자기 말로",
    body: "핵심 어휘와 글의 구조를 이해하고, 읽은 내용을 설명합니다. 질문 만들기와 문장 문단 쓰기로 생각을 정리합니다.",
    tag: "초5 과정",
    linkLabel: "초5 과정 알아보기",
    href: "/sub/schedule.n",
  },
  {
    eyebrow: "Elementary Grade 6",
    title: "초6 | 근거를 갖춰 말하고 쓰기",
    body: "서로 다른 관점을 비교하고 자신의 판단을 근거와 함께 표현합니다. 토론과 고쳐 쓰기로 논리적인 글을 완성합니다.",
    tag: "초6 과정",
    linkLabel: "초6 과정 알아보기",
    href: "/sub/schedule.n",
  },
  {
    eyebrow: "Discussion & Debate",
    title: "독서토론 | 다른 생각을 만나 깊어지는 사고",
    body: "문학·비문학을 읽고 같은 주제를 여러 관점에서 살핍니다. 의견을 나누고 질문하며 생각의 근거를 점검합니다.",
    tag: "독서토론",
    linkLabel: "독서토론 과정 알아보기",
    href: "/sub/schedule.n",
  },
  {
    eyebrow: "Vocabulary Clinic",
    title: "어휘 | 뜻을 알고, 문맥에 맞게 쓰기",
    body: "교과 개념어와 학습 도구어를 글 속에서 익힙니다. 단어의 관계를 연결하고 문맥에 맞게 활용합니다.",
    tag: "어휘 클리닉",
    linkLabel: "어휘 과정 알아보기",
    href: "/sub/schedule.n",
  },
  {
    eyebrow: "Writing Mastery",
    title: "글쓰기 | 생각의 순서를 세우는 연습",
    body: "문장과 문단을 연결하고 주장에 알맞은 근거를 배치합니다. 강사와 함께 글을 살피며 내용과 표현을 다듬습니다.",
    tag: "글쓰기 전담반",
    linkLabel: "글쓰기 과정 알아보기",
    href: "/sub/schedule.n",
  },
  {
    eyebrow: "Literacy Assessment",
    title: "우리 아이의 읽기와 표현, 어디까지 자랐을까요?",
    body: "어휘·독해·추론·글쓰기를 살펴 강점과 보완할 부분을 확인합니다. 진단 결과를 바탕으로 필요한 학습 방향을 안내합니다.",
    tag: "진단 신청",
    linkLabel: "문해력 진단 신청",
    href: "/sub/abouttch3",
  },
] as const;

const LEARNING_STEPS = [
  {
    step: "STEP 1",
    title: "1 Hour | 어휘 & 핵심 독해",
    body: "지문 분석을 위한 필수 어휘를 정립하고, 글의 핵심 문단 구조를 파악하는 독해 훈련을 진행합니다.",
  },
  {
    step: "STEP 2",
    title: "1 Hour | 사고 확장 & 토론",
    body: "다양한 관점에서 질문을 던지고 논리를 점검하며 논술·토론을 통해 입체적인 사고력을 기릅니다.",
  },
  {
    step: "STEP 3",
    title: "1 Hour | 표현 및 1:1 첨삭",
    body: "자신의 생각을 체계적인 논술문으로 완성하고, 1:1 맞춤형 피드백을 받아 글을 즉시 정밀하게 수정합니다.",
  },
] as const;

export function HomeQuestion() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          읽은 뒤, 자기 말로 설명할 수 있나요?
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
          내용을 이해하고 생각을 정리해 표현하는 과정에도 연습이 필요합니다. 문사유는 그
          과정을 단계별로 연결합니다.
        </p>
      </div>
    </section>
  );
}

export function HomeCharacteristics() {
  return (
    <Section
      eyebrow="OUR CHARACTERISTICS"
      title="읽기에서 글쓰기까지, 하나로 이어지는 5단계 학습"
      description="한 편의 글에서 출발해 어휘를 이해하고, 질문하고, 토론한 뒤 글로 정리합니다."
      tone="surface"
    >
      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {CHARACTERISTICS.map((item) => (
          <li key={item.title} className="rounded-xl border border-line bg-canvas p-6">
            <h3 className="text-base font-bold text-ink">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function HomeCurriculum() {
  return (
    <Section
      eyebrow="ELEMENTARY CURRICULUM"
      title="초등 독서논술·문해력 클래스"
      description={
        <>
          초등 고학년, 읽기와 표현의 기초를 단단하게
          <br />
          초5·초6의 학습 단계에 맞춰 이해·사고·표현을 연결합니다.
        </>
      }
    >
      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {CURRICULUM.map((item) => (
          <li
            key={item.title}
            className="flex flex-col rounded-xl border border-line bg-surface p-6"
          >
            <p className="text-xs font-bold tracking-[0.2em] text-accent">
              {item.eyebrow}
            </p>
            <h3 className="mt-3 text-lg font-bold text-ink">{item.title}</h3>
            <p className="mt-3 grow text-sm leading-relaxed text-muted">{item.body}</p>
            <p className="mt-5 text-xs font-bold text-muted">{item.tag}</p>
            <Link
              href={item.href}
              className="mt-2 text-sm font-bold text-brand hover:underline"
            >
              {item.linkLabel}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function HomeLearningSystem() {
  return (
    <Section
      eyebrow="LEARNING SYSTEM"
      title="COSMO Daily 3 Hours Step & System"
      description="몰입도를 높이는 3시간 체계적 단계별 학습 프로그램"
      tone="surface"
    >
      <ol className="grid gap-5 md:grid-cols-3">
        {LEARNING_STEPS.map((item) => (
          <li key={item.step} className="rounded-xl border border-line bg-canvas p-6">
            <p className="text-xs font-bold tracking-[0.2em] text-accent">
              {item.step}
            </p>
            <h3 className="mt-3 text-base font-bold text-ink">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

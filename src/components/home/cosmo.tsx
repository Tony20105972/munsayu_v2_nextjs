import { Section } from "@/components/ui/section";

/** 모든 문구는 docs/evidence/dom/phase1-home.yml 의 PROJECT COSMO 영역 관찰값이다. */

const STATS = [
  { value: "51만 개", label: "표준국어대사전 낱말" },
  { value: "1,000 개", label: "교과 데이터베이스 추출 어휘" },
  { value: "50 단원", label: "CORE 어휘 교재 단원 수" },
  { value: "750 문항", label: "객관식 문해력 문항" },
] as const;

const UNIT_FLOW = [
  {
    no: "01",
    title: "단어쌍 비교",
    body: "왜 함께 배우는지, 어떻게 구별하는지 익힙니다.",
  },
  {
    no: "02",
    title: "교과 연계",
    body: "단어쌍마다 관련 교과를 표시해 학교 공부와 잇습니다.",
  },
  { no: "03", title: "표현 확장", body: "관용 표현과 속담으로 쓰임을 넓힙니다." },
  { no: "04", title: "문해력 문항", body: "배운 단어를 지문 속에서 다시 찾아 씁니다." },
] as const;

const DAILY_PERIODS = [
  {
    title: "1교시 (50분): 어휘 (CORE)",
    body: "단어쌍을 비교하며 뜻을 정확히 익힙니다.",
  },
  {
    title: "2교시 (50분): 도서 안내와 쓰기",
    body: "함께 읽을 책을 살펴보고 생각을 글로 작성합니다.",
  },
  {
    title: "3교시 (50분): 토론과 토의 (FLARE)",
    body: "읽은 내용을 바탕으로 생각을 나누고 넓힙니다.",
  },
] as const;

const CLASS_GROUPS = [
  "5학년 독해반",
  "5학년 논리반",
  "6학년 독해반",
  "6학년 논리반",
] as const;

export const ASSESSMENT_AREAS = [
  { area: "어휘력", score: "24점" },
  { area: "문학 독해", score: "18점" },
  { area: "비문학: 사회", score: "5학년 20 / 6학년 14" },
  { area: "비문학: 과학", score: "5학년 10 / 6학년 16" },
  { area: "논리 표현", score: "8점" },
  { area: "논술 구성", score: "20점" },
] as const;

export const ASSESSMENT_HEADING =
  "COSMO 스펙트럼 진단평가 영역 (40분 / 24문항 / 100점)";

const TEXTBOOKS = [
  {
    eyebrow: "CORE 어휘 교재",
    title: "SET 03: 가정 / 가설",
    body: "과학탐구실험 교과연계. 한자풀이 및 쉬운 풀이로 조건 정하기와 원인 설명의 개념 차이를 익힙니다.",
  },
  {
    eyebrow: "FLARE 독서 교재",
    title: "기준점 찾기: 균형점 기록",
    body: "합의 문장 작성 및 점검 도구를 통해 독서 후 논리적인 자기 생각을 정립합니다.",
  },
] as const;

/** 진단평가 영역 표. `/sub/abouttch3` 에서도 같은 값을 쓴다. */
export function AssessmentTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-xs border-collapse text-sm">
        <caption className="sr-only">{ASSESSMENT_HEADING}</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="py-3 pr-4 font-bold">
              평가 영역
            </th>
            <th scope="col" className="py-3 font-bold">
              배점
            </th>
          </tr>
        </thead>
        <tbody>
          {ASSESSMENT_AREAS.map((row) => (
            <tr key={row.area} className="border-b border-line">
              <th scope="row" className="py-3 pr-4 text-left font-bold text-ink">
                {row.area}
              </th>
              <td className="py-3 text-muted">{row.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * PROJECT COSMO 의 두 축. 레거시는 설명 문단 위에 묶음 이름(`COSMO: CORE (어휘)`)과
 * 제목을 함께 보여 준다. Phase 3 구현에는 설명만 있고 이름·제목이 빠져 있었다. (EV-0015)
 */
const COSMO_PILLARS = [
  {
    eyebrow: "COSMO: CORE (어휘)",
    title: "모든 힘의 근원이 되는 단단한 중심핵",
    body: "평생 쓸 필수 어휘를 정교하게 체화합니다. 헷갈리는 단어를 짝으로 묶어 비교하며 뜻의 경계를 익힙니다.",
  },
  {
    eyebrow: "COSMO: FLARE (독서)",
    title: "세상 밖으로 터뜨리는 폭발적 확장",
    body: "엄선된 텍스트를 깊이 읽어내며 구조적 사고와 독해력을 키웁니다. 토론보다 먼저 잘 읽는 근본 실력을 배양합니다.",
  },
] as const;

/** 레거시 단어쌍 비교 카드. 뜻풀이 문구까지 관찰값 그대로다. (EV-0015) */
const WORD_PAIRS = [
  {
    left: { word: "결재", meaning: "윗사람이 안건을 승인하다" },
    right: { word: "결제", meaning: "값을 치러 거래를 끝내다" },
  },
  {
    left: { word: "맞히다", meaning: "문제의 답을 옳게 하다" },
    right: { word: "맞추다", meaning: "둘을 서로 비교하거나 붙이다" },
  },
] as const;

export function HomeCosmo() {
  return (
    <Section
      eyebrow="ELEMENTARY LITERACY PROGRAM"
      title="초등 문해력의 완성: PROJECT COSMO"
      description="초등학교 2015·2022 개정 교과서 데이터베이스 기반 어휘·독해 체계적 정밀 솔루션"
    >
      <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {STATS.map((stat) => (
          <li
            key={stat.label}
            className="rounded-xl border border-line bg-surface p-6 text-center"
          >
            <p className="text-2xl font-bold text-brand">{stat.value}</p>
            <p className="mt-2 text-xs text-muted">{stat.label}</p>
          </li>
        ))}
      </ul>

      {/* 레거시는 두 설명 위에 묶음 이름과 제목을 함께 보여 준다. (EV-0015) */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {COSMO_PILLARS.map((pillar) => (
          <div
            key={pillar.eyebrow}
            className="rounded-xl border border-line bg-surface p-6"
          >
            <p className="text-xs font-bold tracking-[0.2em] text-accent">
              {pillar.eyebrow}
            </p>
            <h3 className="mt-2 text-base font-bold text-ink">{pillar.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{pillar.body}</p>
          </div>
        ))}
      </div>

      {/* 헷갈리는 단어쌍 비교. 레거시 「우리 아이는 이 차이를 설명할 수 있을까요?」 (EV-0015) */}
      <div className="mt-12">
        <h3 className="text-lg font-bold text-ink">
          우리 아이는 이 차이를 설명할 수 있을까요?
        </h3>
        <ul className="mt-5 grid gap-5 md:grid-cols-2">
          {WORD_PAIRS.map((pair) => (
            <li
              key={`${pair.left.word}-${pair.right.word}`}
              className="rounded-xl border border-line bg-surface p-6"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-base font-bold text-ink">{pair.left.word}</p>
                  <p className="mt-1 text-sm text-muted">{pair.left.meaning}</p>
                </div>
                <span
                  className="text-xs font-bold tracking-[0.2em] text-accent"
                  aria-hidden="true"
                >
                  VS
                </span>
                <div className="flex-1">
                  <p className="text-base font-bold text-ink">{pair.right.word}</p>
                  <p className="mt-1 text-sm text-muted">{pair.right.meaning}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12">
        <h3 className="text-lg font-bold text-ink">COSMO: CORE 한 단원의 학습 흐름</h3>
        <ol className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {UNIT_FLOW.map((step) => (
            <li key={step.no} className="rounded-xl border border-line bg-surface p-6">
              <p className="text-xs font-bold tracking-[0.2em] text-accent">
                {step.no}
              </p>
              <p className="mt-2 text-base font-bold text-ink">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-6">
          <h3 className="text-lg font-bold text-ink">COSMO의 하루 (3교시 시스템)</h3>
          <dl className="mt-4 space-y-4">
            {DAILY_PERIODS.map((period) => (
              <div key={period.title}>
                <dt className="text-sm font-bold text-ink">{period.title}</dt>
                <dd className="mt-1 text-sm text-muted">{period.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6">
          <h3 className="text-lg font-bold text-ink">학년별 4개 반 편성 및 진도</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {CLASS_GROUPS.map((group) => (
              <li
                key={group}
                className="rounded-full border border-line px-4 py-2 text-sm text-ink"
              >
                {group}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-muted">
            학기 중: 독서 2주 1권 / 어휘 1주 1단원 | 방학 중: 1주 1권 압축 독서
          </p>
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-line bg-surface p-6">
        <h3 className="text-lg font-bold text-ink">{ASSESSMENT_HEADING}</h3>
        <div className="mt-4">
          <AssessmentTable />
        </div>
      </div>

      <ul className="mt-12 grid gap-5 md:grid-cols-2">
        {TEXTBOOKS.map((book) => (
          <li key={book.title} className="rounded-xl border border-line bg-surface p-6">
            <p className="text-xs font-bold tracking-[0.2em] text-accent">
              {book.eyebrow}
            </p>
            <h3 className="mt-3 text-base font-bold text-ink">{book.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{book.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

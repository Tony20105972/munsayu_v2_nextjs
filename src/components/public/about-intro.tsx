import { EXTERNAL_LINKS } from "@/lib/site-config";

/** 모든 문구는 docs/evidence/dom/phase1-about.yml 관찰값이다. (EV-0003) */

const LITERACY_POWERS = [
  {
    title: "의미를 정확히 이해하는 힘",
    body: "같은 말도 맥락에 따라 다르게 읽힙니다. 뜻을 짚고 쓰임을 살피며 이해를 분명하게 합니다.",
  },
  {
    title: "생각의 관계를 읽는 힘",
    body: "정보가 어떻게 이어지는지, 주장에 어떤 이유가 붙는지 살피며 글 전체의 의미를 이해합니다.",
  },
  {
    title: "자신의 판단을 세우는 힘",
    body: "읽은 내용을 받아들이면서도 그 이유를 묻습니다. 다른 관점을 살펴 자신의 생각을 만들어갑니다.",
  },
  {
    title: "자신의 언어로 표현하는 힘",
    body: "이해한 것을 다시 설명하고, 생각에 맞는 말을 고릅니다. 글과 말로 자신의 생각을 전합니다.",
  },
] as const;

const PROMISES = [
  {
    no: "01",
    title: "정확함을 소중히 여깁니다",
    body: "낱말의 뜻을 짚고, 문장의 의미를 살피고, 생각에 맞는 표현을 고르는 일. 작은 이해를 가볍게 넘기지 않는 태도가 깊이 있는 문해력의 바탕이 됩니다.",
  },
  {
    no: "02",
    title: "생각의 넓이를 존중합니다",
    body: "책은 아이가 아직 경험하지 못한 세계를 만나는 자리입니다. 새로운 관점에 귀 기울이고 자신의 생각을 넓혀가는 힘을 소중히 여깁니다.",
  },
] as const;

function Block({
  eyebrow,
  heading,
  children,
}: {
  eyebrow: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line py-14">
      <p className="text-xs font-bold tracking-[0.3em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{heading}</h2>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export function AboutIntro() {
  return (
    <div className="mx-auto max-w-4xl px-4">
      <Block
        eyebrow="문해와 사유의 생각"
        heading="낱말이 자리를 잡으면, 생각에 질서가 생깁니다."
      >
        <p>아이의 언어가 자라는 시기, 우리는 그 바탕에 주목합니다.</p>
        <p>
          하나의 낱말을 정확히 이해하는 일은 하나의 생각을 분명하게 만드는 일입니다.
          말의 뜻과 쓰임을 알수록 글 속의 관계가 보이고, 읽은 내용을 자신의 생각으로
          이어갈 수 있습니다.
        </p>
        <p>
          어휘는 이해의 중심을 세우고, 독서는 그 이해를 넓혀갑니다. 문해와 사유는 이 두
          힘이 연결될 때 아이의 문해력이 깊어진다고 믿습니다.
        </p>
        <p className="font-bold text-ink">
          어휘로 중심을 다지고, 독서로 세계를 넓힙니다.
        </p>
      </Block>

      <Block eyebrow="어휘와 독서" heading="단단한 중심에서, 넓은 세계로.">
        <p>태양의 중심핵과 그 빛의 확장에서 영감을 얻었습니다.</p>
        <p>어휘와 독서가 연결되며 아이의 언어는 깊어지고 넓어집니다.</p>
        <div className="grid gap-5 pt-2 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-6">
            <p className="text-xs font-bold text-accent">어휘, 생각의 중심</p>
            <h3 className="mt-2 text-base font-bold text-ink">
              정확한 이해는 낱말에서 시작됩니다.
            </h3>
            <p className="mt-3">
              뜻을 아는 데서 나아가, 문맥에 따라 달라지는 의미와 쓰임을 이해하는 것.
              서로 닮은 말의 차이를 알아보고, 생각에 맞는 말을 고르는 것.
            </p>
            <p className="mt-3">
              어휘가 정교해질수록 아이가 이해하고 표현할 수 있는 생각도 선명해집니다.
            </p>
            <p className="mt-4 text-sm font-bold text-ink">중심을 세우는 언어.</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-6">
            <p className="text-xs font-bold text-accent">독서, 생각의 확장</p>
            <h3 className="mt-2 text-base font-bold text-ink">
              낱말로 세운 이해는 글을 만나 넓어집니다.
            </h3>
            <p className="mt-3">
              문장 사이의 관계를 읽고, 하나의 글이 전하는 생각을 따라가는 것. 자신과
              다른 경험과 관점을 만나 익숙한 생각을 새롭게 바라보는 것.
            </p>
            <p className="mt-3">독서는 아이가 가진 언어를 더 넓은 세계와 연결합니다.</p>
            <p className="mt-4 text-sm font-bold text-ink">세계를 넓히는 읽기.</p>
          </div>
        </div>
        <p className="pt-2 font-bold text-ink">
          중심이 깊어질수록, 읽기의 세계도 넓어집니다.
        </p>
      </Block>

      <Block
        eyebrow="우리가 바라보는 문해력"
        heading="글을 이해하는 힘은, 세상을 이해하는 힘으로 이어집니다."
      >
        <p>
          문해와 사유가 지향하는 문해력은 낱말과 문장을 읽는 능력에서 시작해, 의미와
          관계를 이해하고 자신의 판단을 세우는 힘으로 이어집니다.
        </p>
        <ul className="grid gap-5 pt-2 sm:grid-cols-2">
          {LITERACY_POWERS.map((item) => (
            <li
              key={item.title}
              className="rounded-xl border border-line bg-surface p-6"
            >
              <h3 className="text-base font-bold text-ink">{item.title}</h3>
              <p className="mt-3">{item.body}</p>
            </li>
          ))}
        </ul>
        <p className="pt-2 font-bold text-ink">
          정확한 이해 위에 깊은 생각이, 깊은 생각 위에 분명한 표현이 자랍니다.
        </p>
      </Block>

      <Block
        eyebrow="언어의 바탕을 만드는 시간"
        heading="지금 자라는 언어가, 앞으로의 배움을 받칩니다."
      >
        <p>
          초등 시기는 일상의 말에서 더 넓은 개념의 언어로 나아가는 때입니다. 글이 담고
          있는 생각은 복잡해지고, 이해한 내용을 스스로 설명해야 하는 순간도 많아집니다.
        </p>
        <p>
          이때 정확한 어휘와 깊이 있는 독서는 새로운 배움을 받아들이는 바탕이 됩니다.
          문해와 사유는 아이가 앞으로 만날 글과 지식을 자신의 힘으로 이해할 수 있도록,
          지금의 언어를 단단히 세우는 일에 집중합니다.
        </p>
        <div className="rounded-xl border border-line bg-surface p-6">
          <h3 className="text-base font-bold text-ink">
            서두르는 성장보다, 깊이 있는 바탕.
          </h3>
          <p className="mt-3">
            어려운 말을 많이 안다는 것과 그 뜻을 정확히 이해한다는 것은 다릅니다. 책을
            많이 읽었다는 것과 읽은 내용을 자신의 생각으로 만들었다는 것도 다릅니다.
          </p>
          <p className="mt-3 font-bold text-ink">
            우리는 아이가 무엇을 알고 있는지와 함께, 어떻게 이해하고 있는지를 소중히
            봅니다.
          </p>
        </div>
        <div className="grid gap-5 pt-2 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-6">
            <h3 className="text-base font-bold text-ink">
              아이의 변화는, 자신의 언어에서 드러납니다.
            </h3>
            <p className="mt-3">
              읽은 내용을 설명할 때 핵심을 짚는 말. 자신의 의견에 이유를 붙이는 문장.
              다른 생각을 만난 뒤 한 번 더 고민하는 태도.
            </p>
            <p className="mt-3">
              문해와 사유는 이런 변화에 주목합니다. 더 정확하게 이해하고, 더 깊이
              생각하고, 더 분명하게 표현하는 과정이 아이의 성장이라고 믿습니다.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-6">
            <h3 className="text-base font-bold text-ink">
              생각의 주인은, 언제나 아이입니다.
            </h3>
            <p className="mt-3">
              자신이 이해한 것을 자신의 말로 설명할 수 있는 것. 무엇을 믿고 왜 그렇게
              생각하는지 스스로 말할 수 있는 것.
            </p>
            <p className="mt-3">
              문해와 사유가 지향하는 교육은 아이 스스로 생각할 수 있는 단단한 힘을
              기르는 것입니다.
            </p>
          </div>
        </div>
      </Block>

      <Block eyebrow="문해와 사유의 약속" heading="단단한 언어, 넓어지는 세계.">
        <p>
          어휘로 중심을 세우고, 독서로 생각을 확장합니다. 문해와 사유는 아이의 문해력이
          깊어지는 과정에 함께합니다.
        </p>
        <ol className="grid gap-5 pt-2 md:grid-cols-2">
          {PROMISES.map((promise) => (
            <li
              key={promise.no}
              className="rounded-xl border border-line bg-surface p-6"
            >
              <p className="text-xs font-bold tracking-[0.2em] text-accent">
                {promise.no}
              </p>
              <h3 className="mt-2 text-base font-bold text-ink">{promise.title}</h3>
              <p className="mt-3">{promise.body}</p>
            </li>
          ))}
        </ol>
        <div className="pt-4 text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-accent">
            읽다 • 쓰다 • 말하다
          </p>
          <h3 className="mt-3 text-lg font-bold text-ink sm:text-xl">
            자신의 언어로 이해하고, 자신의 생각으로 나아갑니다.
          </h3>
        </div>
        <div className="mt-6 rounded-xl border border-line bg-surface p-6 text-center">
          <h3 className="text-base font-bold text-ink">
            아이의 읽기와 언어에 대해 궁금한 점을 들려주세요.
          </h3>
          <p className="mt-3">문해와 사유가 지향하는 교육을 안내해 드립니다.</p>
          <a
            href={EXTERNAL_LINKS.kakaoChannel}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-block rounded-md bg-accent px-6 py-3 text-sm font-bold text-ink hover:bg-accent-soft"
          >
            카카오톡 상담하기
          </a>
        </div>
      </Block>
    </div>
  );
}

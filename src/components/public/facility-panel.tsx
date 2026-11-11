import { CAMPUSES, EXTERNAL_LINKS, type Campus } from "@/lib/site-config";

/**
 * 시설안내 지점 패널.
 * 대치본원 문구는 docs/evidence/dom/phase1-facility.yml 관찰값이다.
 * 레거시의 사진 슬라이드는 원본 이미지를 확보하지 못해 글 카드로 대신한다. // ASM-042
 * 분당점 패널은 레거시 탭이 접혀 있어 관찰하지 못했다. // ASM-049
 */

const DAECHI_FEATURES = [
  {
    eyebrow: "ATMOSPHERE",
    title: "절제된 색감과 따뜻한 소재",
    body: "밝은 중성색에 목재의 질감을 더했습니다. 간결한 선과 차분한 색감이 어우러져, 아이가 오래 머물기에도 부담스럽지 않은 분위기입니다.",
  },
  {
    eyebrow: "PERSPECTIVE",
    title: "시야가 이어지는 공간",
    body: "유리 파티션으로 공간의 연결감을 살렸습니다. 교실과 공용 공간의 구분을 유지하면서, 교실로 이어지는 흐름이 한눈에 들어옵니다.",
  },
  {
    eyebrow: "CLASSROOM",
    title: "책과 글을 위한 교실",
    body: "개별 책상과 정돈된 배치로 자신의 읽기와 쓰기에 집중하는 자리를 마련했습니다. 아이의 책과 글이 공간의 중심이 됩니다.",
  },
  {
    eyebrow: "FLOW OF MOVEMENT",
    title: "역할이 분명한 동선",
    body: "안내 데스크, 교무 공간, 교실의 역할을 나누었습니다. 방문과 안내, 수업 준비와 학습이 각자의 자리에서 이어집니다.",
  },
] as const;

function ContactCard({ campus }: { campus: Campus }) {
  return (
    <div className="mt-10 rounded-xl border border-line bg-surface p-6 text-center">
      <h3 className="text-base font-bold text-ink">
        문해와 사유 {campus.name}을 만나보세요
      </h3>
      <p className="mt-3 text-sm text-muted">
        공간과 방문에 관해 궁금한 점을 들려주세요. 카카오톡으로 문의하시면 안내해
        드립니다.
      </p>
      <a
        href={EXTERNAL_LINKS.kakaoChannel}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-5 inline-block rounded-md bg-accent px-6 py-3 text-sm font-bold text-ink hover:bg-accent-soft"
      >
        카카오톡 상담
      </a>
    </div>
  );
}

export function FacilityPanel({ campusId }: { campusId: Campus["id"] }) {
  const campus = CAMPUSES.find((item) => item.id === campusId);

  if (!campus) {
    return null;
  }

  if (campusId !== "daechi") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-xs font-bold tracking-[0.3em] text-accent">
          문해와 사유 {campus.name}
        </p>
        <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
          {campus.name} 시설 안내
        </h2>
        <p className="mt-5 rounded-xl border border-line bg-surface p-6 text-sm leading-relaxed text-muted">
          {campus.name} 시설 소개는 준비 중입니다. {campus.address} 에 있으며 방문
          상담은 {campus.phone} 으로 문의해 주세요.
        </p>
        <ContactCard campus={campus} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="text-xs font-bold tracking-[0.3em] text-accent">문해와 사유 대치</p>
      <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
        단정한 공간, 깊이 있는 배움
      </h2>
      <p className="mt-5 text-sm leading-relaxed text-muted">
        문해와 사유 대치는 밝은 색조와 투명한 시야, 절제된 목재의 온기를 담았습니다.
        책과 글에 마음을 기울 이는 교실부터 안내가 시작되는 입구까지. 필요한 자리를
        단정하게 정리해 아이의 배움이 공간의 중심에 놓이도록 했습니다.
      </p>

      <div className="mt-8 rounded-xl border border-line bg-surface p-6">
        <h3 className="text-lg font-bold text-ink">
          공간은 간결하게, 생각은 깊이 있게.
        </h3>
        <p className="mt-3 text-sm text-muted">
          문해와 사유 대치는 밝은 색조와 투명한 시야, 절제된 목재의 온기를 담았습니다
        </p>
      </div>

      <ul className="mt-8 grid gap-5 md:grid-cols-2">
        {DAECHI_FEATURES.map((feature) => (
          <li
            key={feature.eyebrow}
            className="rounded-xl border border-line bg-surface p-6"
          >
            <p className="text-xs font-bold tracking-[0.2em] text-accent">
              {feature.eyebrow}
            </p>
            <h3 className="mt-3 text-base font-bold text-ink">{feature.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{feature.body}</p>
          </li>
        ))}
      </ul>

      <ContactCard campus={campus} />
    </div>
  );
}

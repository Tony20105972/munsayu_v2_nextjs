import { CAMPUSES, type Campus } from "@/lib/site-config";

/**
 * 오시는 길 지점 패널.
 * 대치본원 내용은 docs/evidence/dom/phase1-location.yml 관찰값이다.
 *
 * 분당점 패널은 Phase 3 때 탭이 접혀 있어 보지 못해 주소·전화만 두었다(ASM-049).
 * Phase 5 동등성 검증에서 레거시 HTML 을 직접 받아 분당점 탭 본문이 문서 안에 모두
 * 있는 것을 확인하고 관찰값으로 채웠다. ASM-049 해소. (EV-0015)
 *
 * 레거시 분당점 탭의 「버스 이용 시」 표는 머리글(`정류장명 (정류장번호)` ·
 * `운행 버스 노선`)만 있고 **줄이 하나도 없다.** 그래서 신규도 버스 칸을 비워 둔다.
 * 레거시의 지도 iframe은 외부 요청을 만들어 신규 화면에서는 지도 서비스 링크만 제공한다. // ASM-050
 */

type TransitLine = {
  line: string;
  exit: string;
  detail: string;
};

type BusStop = {
  stop: string;
  routes: string;
};

type LocationDetail = {
  campus: Campus;
  addressDetail: string | null;
  nearbyBadge: string | null;
  walkingNotes: readonly string[];
  subway: readonly TransitLine[];
  buses: readonly BusStop[];
};

const DAECHI = CAMPUSES[0];
const BUNDANG = CAMPUSES[1];

const LOCATION_DETAILS: readonly LocationDetail[] = [
  {
    campus: DAECHI,
    addressDetail: "(도곡로 515, 한도빌딩)",
    nearbyBadge: "역세권 인근",
    walkingNotes: ["한티역 2번 출구 도보 15분", "대치역 3번 출구 도보 9분"],
    subway: [
      {
        line: "수인분당선",
        exit: "한티역 3번 출구",
        detail: "이용 (출구 나와서 롯데백화점 방향 도보 15분)",
      },
      {
        line: "3호선",
        exit: "대치역 2번 출구 이용",
        detail: "이용 (출구 나와서 은마아파트 사거리 방향 도보9분 직진)",
      },
    ],
    buses: [
      { stop: "한티역·서울축협본점 (23-227)", routes: "340 420 461 2413 6411" },
      { stop: "한티역7번출구·대치동고개 (23-316)", routes: "333 472 3422 4432" },
      { stop: "도곡렉슬아파트정문 (23-311)", routes: "340 420 461 2413 4412" },
    ],
  },
  {
    campus: BUNDANG,
    addressDetail: "(내정로173번길 1)",
    nearbyBadge: null,
    walkingNotes: [
      "수인분당선 수내역 2번 출구 도보 8분",
      "수인분당선 정자역 1번 출구 도보 15분",
    ],
    subway: [
      {
        line: "수인분당선",
        exit: "수내역 2번 출구 이용",
        detail: "(내정로 방면 도보 약 8분 직진)",
      },
      {
        line: "신분당선",
        exit: "정자역 1번 출구 이용",
        detail: "(수내교 방면 버스 환승 또는 도보 이동)",
      },
    ],
    // 레거시 분당점 탭의 버스 표에는 머리글만 있고 줄이 없다. (EV-0015)
    buses: [],
  },
];

function mapLinks(address: string) {
  const encoded = encodeURIComponent(address);

  return [
    { label: "네이버 지도 확인", href: `https://map.naver.com/v5/search/${encoded}` },
    { label: "카카오맵 확인", href: `https://map.kakao.com/?q=${encoded}` },
    {
      label: "구글 지도 확인",
      href: `https://www.google.com/maps/search/?api=1&query=${encoded.replaceAll("%20", "+")}`,
    },
  ];
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <div className="mt-3 space-y-1 text-sm text-muted">{children}</div>
    </div>
  );
}

export function LocationPanel({ campusId }: { campusId: Campus["id"] }) {
  const detail = LOCATION_DETAILS.find((item) => item.campus.id === campusId);

  if (!detail) {
    return null;
  }

  const { campus } = detail;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-6 py-5">
        <p className="text-sm font-bold text-ink">
          문사유 ({campus.name}){" "}
          <span className="font-normal text-muted">| {campus.address}</span>
        </p>
        {detail.nearbyBadge ? (
          <span className="rounded-full bg-canvas px-3 py-1 text-xs font-bold text-brand">
            {detail.nearbyBadge}
          </span>
        ) : null}
      </div>

      <ul className="mt-4 flex flex-wrap gap-3">
        {mapLinks(campus.address).map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-block rounded-md border border-line bg-surface px-4 py-2 text-sm font-bold text-ink hover:bg-canvas"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <InfoCard title="주소 및 위치">
          <p>{campus.address}</p>
          {detail.addressDetail ? <p>{detail.addressDetail}</p> : null}
        </InfoCard>

        {detail.walkingNotes.length > 0 ? (
          <InfoCard title="지하철 역 도보 기준">
            {detail.walkingNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </InfoCard>
        ) : null}

        <InfoCard title="상담전화">
          <p>
            <a href={campus.telHref} className="font-bold text-brand hover:underline">
              {campus.phone}
            </a>
          </p>
        </InfoCard>
      </div>

      {detail.subway.length > 0 ? (
        <section className="mt-10 rounded-xl border border-line bg-surface p-6">
          <h3 className="text-base font-bold text-ink">지하철 이용 시</h3>
          <ul className="mt-4 space-y-4 text-sm">
            {detail.subway.map((line) => (
              <li key={line.line}>
                <p className="text-xs font-bold text-accent">{line.line}</p>
                <p className="mt-1 text-muted">
                  <strong className="font-bold text-ink">{line.exit}</strong>{" "}
                  {line.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {detail.buses.length > 0 ? (
        <section className="mt-6 rounded-xl border border-line bg-surface p-6">
          <h3 className="text-base font-bold text-ink">버스 이용 시</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-md border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="py-3 pr-4 font-bold">
                    정류장명 (정류장번호)
                  </th>
                  <th scope="col" className="py-3 font-bold">
                    운행 버스 노선
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.buses.map((bus) => (
                  <tr key={bus.stop} className="border-b border-line">
                    <th scope="row" className="py-3 pr-4 text-left font-bold text-ink">
                      {bus.stop}
                    </th>
                    <td className="py-3 text-muted">{bus.routes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {detail.subway.length === 0 ? (
        <p className="mt-8 rounded-xl border border-line bg-surface p-6 text-sm text-muted">
          {campus.name} 교통편 안내는 준비 중입니다. 방문 전 {campus.phone} 으로 문의해
          주세요.
        </p>
      ) : null}
    </div>
  );
}

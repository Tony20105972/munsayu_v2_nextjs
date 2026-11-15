import { AssessmentTable, ASSESSMENT_HEADING } from "@/components/home/cosmo";
import { CAMPUSES, EXTERNAL_LINKS } from "@/lib/site-config";

const DAECHI = CAMPUSES[0];
const BUNDANG = CAMPUSES[1];

/**
 * 진단평가·입학상담 안내. `/sub/about` 3번 탭과 `/sub/abouttch3` 이 함께 쓴다.
 *
 * 문구와 평가 영역 표는 docs/evidence/dom/phase1-home.yml 관찰값이다.
 * 상담 절차 4단계와 학원 안내는 Phase 5 동등성 검증에서 레거시 `/sub/about` 3번 탭을
 * 직접 읽어 채웠다. Phase 3 때는 탭 본문을 보지 못해 빠져 있었다. (EV-0015, ASM-048)
 *
 * 「문해력 진단 신청」은 사이트 안에 폼을 두지 않고 구글 폼으로 보낸다. 주소는 관리자
 * 설정(`diagnosis.cta.externalUrl`)에서 바꾼다. 설정이 없으면 레거시 주소를 쓴다.
 * (RT-003, 사용자 결정 2026-11-12) // ASM-082
 *
 * 레거시 `/sub/about` 3번 탭에는 바로 내는 상담 신청 폼도 있었다. 되살릴지는 원장님
 * 확인 대상이라 지금은 넣지 않는다. // ASM-096 (Q-ADM-16)
 */

/** 레거시 상담 절차 4단계. 문구 그대로다. (EV-0015) */
const CONSULT_STEPS = [
  { no: "01", title: "예약", body: "전화나 방문으로 COSMO 스펙트럼 예약" },
  { no: "02", title: "응시", body: "40분 COSMO 스펙트럼 진단평가 응시" },
  { no: "03", title: "상담", body: "결과지를 보며 학부모 밀착 전문 상담" },
  { no: "04", title: "수업 시작", body: "4개 반 중 맞춤 배정 후 수업 진행" },
] as const;
export function DiagnosisSection({
  diagnosisUrl = EXTERNAL_LINKS.literacyDiagnosis,
}: {
  diagnosisUrl?: string;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
        우리 아이의 읽기와 표현, 어디까지 자랐을까요?
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        어휘·독해·추론·글쓰기를 살펴 강점과 보완할 부분을 확인합니다. 진단 결과를
        바탕으로 필요한 학습 방향을 안내합니다.
      </p>

      <div className="mt-8 rounded-xl border border-line bg-surface p-6">
        <h3 className="text-base font-bold text-ink">{ASSESSMENT_HEADING}</h3>
        <div className="mt-4">
          <AssessmentTable />
        </div>
      </div>

      {/* 레거시 3번 탭의 상담 절차·학원 안내. (EV-0015) */}
      <div className="mt-12">
        <p className="text-xs font-bold tracking-[0.2em] text-accent">
          PROCESS &amp; CONTACT
        </p>
        <h3 className="mt-3 text-lg font-bold text-ink">
          상담 절차 및 입학 진단 신청
        </h3>
        <ol className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CONSULT_STEPS.map((step) => (
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

      <div className="mt-8 rounded-xl border border-line bg-surface p-6">
        <h3 className="text-base font-bold text-ink">[문해와 사유] 학원 안내</h3>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-bold text-ink">수업 대상</dt>
            <dd className="mt-1 text-muted">초등학교 5~6학년</dd>
          </div>
          <div>
            <dt className="font-bold text-ink">상담 문의</dt>
            <dd className="mt-1 text-muted">
              {DAECHI.name} ({DAECHI.phone}) / {BUNDANG.name} ({BUNDANG.phone})
            </dd>
          </div>
          <div>
            {/*
              레거시가 이 자리에 적어 둔 값 그대로다. 푸터의 `상담시간: 월-금
              13:00-21:00 / 토·일 9:30-21:00` 과 **서로 다르다.** 어느 쪽이 맞는지는
              원장님 확인 대상이다. (Q-ADM-18)
            */}
            <dt className="font-bold text-ink">운영 시간</dt>
            <dd className="mt-1 text-muted">평일 14:00-22:00 / 주말 08:30-22:00</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={diagnosisUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-dark"
        >
          문해력 진단 신청
        </a>
        <a
          href={EXTERNAL_LINKS.kakaoChannel}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-line bg-surface px-6 py-3 text-sm font-bold text-ink hover:bg-canvas"
        >
          카카오톡 상담
        </a>
        <a
          href={DAECHI.telHref}
          className="rounded-md border border-line bg-surface px-6 py-3 text-sm font-bold text-ink hover:bg-canvas"
        >
          전화 상담 {DAECHI.phone}
        </a>
      </div>
    </div>
  );
}

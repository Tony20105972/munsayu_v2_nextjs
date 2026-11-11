import { AssessmentTable, ASSESSMENT_HEADING } from "@/components/home/cosmo";
import { CAMPUSES, EXTERNAL_LINKS } from "@/lib/site-config";

const DAECHI = CAMPUSES[0];

/**
 * 진단평가·입학상담 안내.
 * 문구와 평가 영역 표는 docs/evidence/dom/phase1-home.yml 관찰값이고,
 * 문해력 진단 신청은 외부 Google Forms 링크를 그대로 쓴다. (RT-003)
 */
export function DiagnosisSection() {
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

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={EXTERNAL_LINKS.literacyDiagnosis}
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

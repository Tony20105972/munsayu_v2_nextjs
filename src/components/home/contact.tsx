import Link from "next/link";
import { CAMPUSES, EXTERNAL_LINKS, HOME_COUNSEL_HOURS } from "@/lib/site-config";

const DAECHI = CAMPUSES[0];

/** 홈 하단 상담 안내. 문구·링크는 phase1-home.yml 관찰값이다. */
export function HomeConsult() {
  return (
    <section className="bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            어떤 과정이 맞을지 함께 살펴보세요.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            아이의 학년과 읽기·글쓰기 고민을 알려주시면 적합한 과정과 진단 절차를
            안내합니다.
          </p>
          <p className="mt-2 text-sm font-bold text-ink">{HOME_COUNSEL_HOURS}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={EXTERNAL_LINKS.kakaoChannel}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-md bg-accent px-6 py-3 text-sm font-bold text-ink hover:bg-accent-soft"
          >
            카카오톡 상담
          </a>
          <a
            href={DAECHI.telHref}
            className="rounded-md border border-line px-6 py-3 text-sm font-bold text-ink hover:bg-canvas"
          >
            전화 상담
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * 홈 하단 설명회 안내.
 * 레거시에는 여기에 학년·학생 이름·학교명·보호자 연락처를 받는 `설명회 알림 신청` 폼이 있었다.
 * 그 폼은 Phase 2 계약(FM-002)에 없고 개인정보 동의 절차도 없어 그대로 두지 않는다.
 * 같은 문구를 유지하고 신청은 설명회 예약 화면(PG-010)으로 보낸다. // ASM-047
 */
export function HomeEventNotice() {
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          문사유 초등 교육 설명회
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-white/80">
          읽기·토론·글쓰기가 어떻게 하나의 수업으로 이어지는지 소개합니다. 일정이
          정해지면 안내해 드립니다.
        </p>
        <Link
          href="/sub/Presentation"
          className="mt-8 inline-block rounded-md bg-accent px-6 py-3 text-sm font-bold text-ink hover:bg-accent-soft"
        >
          설명회 일정 확인 및 예약
        </Link>
      </div>
    </section>
  );
}

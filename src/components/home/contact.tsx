import Link from "next/link";
import { EventNoticeForm } from "@/components/home/event-notice-form";
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
 * 홈 하단 설명회 안내 + AD-010 설명회 알림 신청.
 *
 * 레거시에는 여기에 학년·학생 이름·학교명·보호자 연락처를 받는 `설명회 알림 신청` 폼이
 * 있었다(`POST ./sms_subscribe.ajax.php`, EV-0003). Phase 3 에서는 계약이 없어 링크만
 * 두었으나(ASM-047), 사용자 결정(2026-11-12)으로 범위에 들어와 폼을 되살렸다.
 * 레거시에 없던 개인정보·알림 수신 동의를 새로 받는다. **문자 발송은 하지 않는다.** // ASM-086
 */
export function HomeEventNotice({ retentionPolicy }: { retentionPolicy: string }) {
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          문사유 초등 교육 설명회
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-white/80">
          읽기·토론·글쓰기가 어떻게 하나의 수업으로 이어지는지 소개합니다. 아래에 남겨
          주시면 일정이 정해질 때 안내해 드립니다.
        </p>

        <div className="mx-auto mt-8 max-w-xl rounded-xl bg-surface p-6 text-ink">
          <EventNoticeForm retentionPolicy={retentionPolicy} />
        </div>

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

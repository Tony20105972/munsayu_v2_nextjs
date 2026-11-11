import type { ReactNode } from "react";

/**
 * 관리자 화면 공통 조각.
 *
 * 관리자 화면은 직원이 쓰는 업무 화면이다. 꾸밈을 줄이고 한 화면에 많은 정보를 담는다.
 * 표에는 `<th scope>` 를 쓰고 모든 입력에 `<label>` 을 붙인다. (Phase 3 Gate 접근성)
 */

export function AdminPageHeading({
  featureId,
  title,
  description,
  children,
}: {
  /** 기능 ID. 문서·테스트와 같은 값을 쓴다. (CLAUDE.md 10장) */
  featureId: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="text-xs font-bold tracking-wider text-muted">{featureId}</p>
        <h1 className="mt-1 text-xl font-bold text-ink">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  headingId,
  children,
}: {
  title: string;
  description?: ReactNode;
  headingId?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-line bg-surface"
    >
      <div className="border-b border-line px-4 py-3">
        <h2 id={headingId} className="text-base font-bold text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

/** 가로로 넓은 표는 자기 영역에서만 가로 스크롤한다. (390px 폭에서도 본문은 넘치지 않는다) */
export function AdminTableScroll({ children }: { children: ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4">{children}</div>;
}

export const ADMIN_TABLE_CLASS =
  "w-full min-w-max border-collapse text-left text-xs sm:text-sm";
export const ADMIN_TH_CLASS =
  "whitespace-nowrap border-b border-line px-2 py-2 font-bold text-ink";
export const ADMIN_TD_CLASS = "border-b border-line px-2 py-2 align-top text-ink";

export function AdminEmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-2 py-8 text-center text-muted">
        {label}
      </td>
    </tr>
  );
}

/** 개인정보를 다루는 동작 앞에 반드시 보여 주는 안내. (BLUEPRINT 10장, AD-013) */
export function AuditNotice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-accent/50 bg-accent/10 px-3 py-2 text-xs leading-relaxed text-ink">
      {children}
    </p>
  );
}

export function MaskedHint() {
  return (
    <p className="text-xs text-muted">
      이름·연락처는 기본으로 가려서 보여 줍니다. 원문을 보려면 건별 「원문 보기」를
      쓰고, 그 조회는 모두 기록에 남습니다.
    </p>
  );
}

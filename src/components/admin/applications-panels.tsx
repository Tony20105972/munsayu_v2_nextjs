"use client";

import { useId, useState } from "react";
import { ModalDialog } from "@/components/ui/modal-dialog";
import {
  ADMIN_TABLE_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
} from "@/components/admin/ui";
import {
  revealApplicationAction,
  setPurgeEligibilityAction,
} from "@/lib/actions/admin";
import type { AdminApplicationRow } from "@/lib/contracts";
import { formatDateTime } from "@/lib/view-models";

/**
 * AD-008 신청·예약 목록과 AD-013 개인정보 동작.
 *
 * 목록에는 서버가 가린 값(`maskName`/`maskPhone`)만 들어온다. 원문은 건별 「원문 보기」로만
 * 볼 수 있고 그 조회는 서버가 감사기록에 남긴다. 파기 대상 시각 설정도 기록 대상이다.
 */

const STATUS_LABEL: Record<AdminApplicationRow["status"], string> = {
  PENDING: "접수",
  CONFIRMED: "확정",
  CANCELLED: "취소",
};

function RevealApplicationButton({
  kind,
  applicationId,
}: {
  kind: "course" | "event";
  applicationId: string;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{
    name: string;
    phone: string;
    schoolName: string | null;
    department: string | null;
    grade: string;
    attendeeCount: number | null;
    title: string;
    appliedAt: string;
    privacyConsentAt: string;
    retentionPolicyVersion: string;
  } | null>(null);

  function close() {
    setOpen(false);
    // 대화상자를 닫으면 원문을 화면에서 지운다. 열려 있는 동안만 보여 준다.
    setRevealed(null);
    setError(null);
  }

  async function reveal() {
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("applicationId", applicationId);

    setPending(true);
    setError(null);

    const result = await revealApplicationAction(formData);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setRevealed(result.data);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="whitespace-nowrap rounded-md border border-accent/60 bg-accent/10 px-2 py-1 text-xs font-bold text-ink hover:bg-accent/20"
      >
        원문 보기
      </button>

      {open ? (
        <ModalDialog open onClose={close} titleId={titleId}>
          <div className="px-6 py-6">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              개인정보 원문 보기
            </h2>

            <p className="mt-3 rounded-md border border-accent/50 bg-accent/10 px-3 py-2 text-sm leading-relaxed text-ink">
              이 조회는{" "}
              <strong className="font-bold">누가 언제 어느 건을 봤는지</strong> 기록에
              남습니다. 업무에 필요할 때만 열어 주세요.
            </p>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800"
              >
                {error}
              </p>
            ) : null}

            {revealed ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 font-bold text-ink">신청 대상</dt>
                  <dd className="text-ink">{revealed.title}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 font-bold text-ink">이름</dt>
                  <dd className="text-ink">{revealed.name}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 font-bold text-ink">연락처</dt>
                  <dd className="text-ink">{revealed.phone}</dd>
                </div>
                {revealed.schoolName ? (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 font-bold text-ink">학교</dt>
                    <dd className="text-ink">{revealed.schoolName}</dd>
                  </div>
                ) : null}
                {revealed.department ? (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 font-bold text-ink">수강 과정</dt>
                    <dd className="text-ink">{revealed.department}</dd>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 font-bold text-ink">학년</dt>
                  <dd className="text-ink">{revealed.grade}</dd>
                </div>
                {revealed.attendeeCount !== null ? (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 font-bold text-ink">참석 인원</dt>
                    <dd className="text-ink">{revealed.attendeeCount}명</dd>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 font-bold text-ink">신청 일시</dt>
                  <dd className="text-ink">{formatDateTime(revealed.appliedAt)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 font-bold text-ink">동의 일시</dt>
                  <dd className="text-ink">
                    {formatDateTime(revealed.privacyConsentAt)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 font-bold text-ink">보존 정책</dt>
                  <dd className="font-mono text-xs text-muted">
                    {revealed.retentionPolicyVersion}
                  </dd>
                </div>
              </dl>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-md border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-canvas"
              >
                닫기
              </button>
              {revealed ? null : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={reveal}
                  className="flex-1 rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "조회 중…" : "기록을 남기고 보기"}
                </button>
              )}
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}

/**
 * 목록 + 파기 대상 시각 설정을 한 폼으로 묶는다.
 * 체크한 건에만 `purgeEligibleAt` 을 넣고, 넣은 사실은 기록에 남는다. (ASM-009)
 */
export function ApplicationsTable({
  kind,
  rows,
}: {
  kind: "course" | "event";
  rows: readonly AdminApplicationRow[];
}) {
  const formId = useId();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        setPending(true);
        setMessage(null);

        const result = await setPurgeEligibilityAction(formData);
        setPending(false);

        if (!result.ok) {
          setMessage({ tone: "error", text: result.message });
          return;
        }

        setMessage({
          tone: "ok",
          text: `${result.data.updated}건에 파기 대상 시각을 설정했습니다. 설정 기록이 남았습니다.`,
        });
      }}
    >
      <input type="hidden" name="kind" value={kind} />

      <div className="-mx-4 overflow-x-auto px-4">
        <table className={ADMIN_TABLE_CLASS}>
          <caption className="sr-only">
            {kind === "course" ? "강좌 수강 신청 목록" : "설명회 예약 목록"}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH_CLASS}>
                선택
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                신청 대상
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                지점
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                이름
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                연락처
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                학년
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                {kind === "course" ? "수강 과정" : "참석 인원"}
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                상태
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                신청 일시
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                파기 대상 시각
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                개인정보
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-2 py-8 text-center text-muted">
                  조건에 맞는 신청이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className={ADMIN_TD_CLASS}>
                    <label
                      htmlFor={`${formId}-${row.id}`}
                      className="sr-only"
                    >{`${row.title} 신청 선택`}</label>
                    <input
                      id={`${formId}-${row.id}`}
                      type="checkbox"
                      name="applicationIds"
                      value={row.id}
                      className="size-4 accent-brand"
                    />
                  </td>
                  <th scope="row" className={`${ADMIN_TD_CLASS} font-bold`}>
                    {row.title}
                  </th>
                  <td className={ADMIN_TD_CLASS}>{row.campusName ?? "-"}</td>
                  <td className={ADMIN_TD_CLASS}>{row.maskedName}</td>
                  <td className={ADMIN_TD_CLASS}>{row.maskedPhone}</td>
                  <td className={ADMIN_TD_CLASS}>{row.grade}</td>
                  <td className={ADMIN_TD_CLASS}>
                    {kind === "course"
                      ? (row.department ?? "-")
                      : `${row.attendeeCount ?? 0}명`}
                  </td>
                  <td className={ADMIN_TD_CLASS}>{STATUS_LABEL[row.status]}</td>
                  <td className={ADMIN_TD_CLASS}>{formatDateTime(row.appliedAt)}</td>
                  <td className={ADMIN_TD_CLASS}>
                    {row.purgeEligibleAt
                      ? formatDateTime(row.purgeEligibleAt)
                      : "미설정"}
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <RevealApplicationButton kind={row.kind} applicationId={row.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-md border border-line bg-canvas px-3 py-3">
        <h3 className="text-sm font-bold text-ink">
          선택한 건에 파기 대상 시각 설정 (AD-013)
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          강좌 종강·설명회 종료 안내가 끝난 건에 파기 기준 시각을 넣습니다. 시각이 지난
          건은 「개인정보 관리」 화면의 파기 실행에서 지워집니다. 설정한 사실은 기록에
          남습니다.
        </p>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor={`${formId}-purgeEligibleAt`}
              className="block text-xs font-bold text-ink"
            >
              파기 대상 시각 (한국 시간)
            </label>
            <input
              id={`${formId}-purgeEligibleAt`}
              name="purgeEligibleAt"
              type="datetime-local"
              required
              className="mt-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <button
            type="submit"
            disabled={pending || rows.length === 0}
            className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "처리 중…" : "선택한 건에 설정"}
          </button>
          {message ? (
            <p
              role={message.tone === "error" ? "alert" : "status"}
              className={
                message.tone === "error"
                  ? "text-sm font-bold text-red-700"
                  : "text-sm font-bold text-brand"
              }
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}

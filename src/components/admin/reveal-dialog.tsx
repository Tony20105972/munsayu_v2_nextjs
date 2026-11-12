"use client";

import { useId, useState, type ReactNode } from "react";
import { ModalDialog } from "@/components/ui/modal-dialog";
import type { ActionResult } from "@/lib/action-result";

/**
 * AD-013 개인정보 원문 보기 공통 대화상자.
 *
 * 목록에는 가린 값만 들어오고, 원문은 이 대화상자를 열어 서버에 따로 물을 때만 받는다.
 * 그 조회는 서버가 감사기록에 남긴다. 대화상자를 닫으면 화면에서 원문을 지운다.
 */

export type RevealField = { label: string; value: ReactNode };

export function RevealDialogButton<TData>({
  action,
  hiddenFields,
  title,
  buttonLabel = "원문 보기",
  describe,
}: {
  action: (formData: FormData) => Promise<ActionResult<TData>>;
  hiddenFields: Record<string, string>;
  title: string;
  buttonLabel?: string;
  describe: (data: TData) => RevealField[];
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<TData | null>(null);

  function close() {
    setOpen(false);
    setRevealed(null);
    setError(null);
  }

  async function reveal() {
    const formData = new FormData();
    for (const [key, value] of Object.entries(hiddenFields)) {
      formData.append(key, value);
    }

    setPending(true);
    setError(null);

    const result = await action(formData);
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
        {buttonLabel}
      </button>

      {open ? (
        <ModalDialog open onClose={close} titleId={titleId}>
          <div className="px-6 py-6">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
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
                {describe(revealed).map((field) => (
                  <div key={field.label} className="flex gap-2">
                    <dt className="w-28 shrink-0 font-bold text-ink">{field.label}</dt>
                    <dd className="whitespace-pre-wrap break-words text-ink">
                      {field.value}
                    </dd>
                  </div>
                ))}
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
                  {pending ? "불러오는 중…" : "원문 보기"}
                </button>
              )}
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}

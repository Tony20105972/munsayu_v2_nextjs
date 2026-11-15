"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { ModalDialog } from "@/components/ui/modal-dialog";
import type { ActionResult } from "@/lib/action-result";
import type { FieldErrors } from "@/lib/form-errors";

/**
 * 관리자 화면의 폼·버튼 공통 처리.
 *
 * Server Action 을 props 로 받아 호출하고, 실패하면 서버가 돌려준 한국어 문구와
 * 필드별 오류를 그대로 보여 준다. 성공하면 `router.refresh()` 로 서버 자료를 다시 읽는다.
 */

type FormAction = (formData: FormData) => Promise<ActionResult<unknown>>;

export type AdminFormRenderProps = {
  fieldErrors: FieldErrors;
  pending: boolean;
};

export function AdminActionForm({
  action,
  submitLabel,
  successMessage = "저장했습니다.",
  resetOnSuccess = false,
  className,
  children,
}: {
  action: FormAction;
  submitLabel: string;
  successMessage?: string;
  /** 추가 폼처럼 같은 폼을 계속 쓰는 경우 성공 후 입력을 비운다. */
  resetOnSuccess?: boolean;
  className?: string;
  children: (props: AdminFormRenderProps) => ReactNode;
}) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  return (
    <form
      noValidate
      className={className}
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);

        setPending(true);
        setMessage(null);

        const result = await action(formData);
        setPending(false);

        if (!result.ok) {
          setFieldErrors(result.fieldErrors ?? {});
          setMessage({ tone: "error", text: result.message });
          return;
        }

        setFieldErrors({});
        setMessage({ tone: "ok", text: successMessage });
        if (resetOnSuccess) {
          form.reset();
        }
        router.refresh();
      }}
    >
      {children({ fieldErrors, pending })}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "처리 중…" : submitLabel}
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
    </form>
  );
}

/**
 * 한 줄 안에서 바로 바꾸는 폼(상태 선택 상자 등). 제출 버튼이 줄 안에 들어간다.
 * 선택만으로 저장하지 않고 버튼을 눌러야 저장한다 — 키보드 이동 중 실수 저장을 막는다.
 */
export function AdminInlineForm({
  action,
  submitLabel,
  children,
}: {
  action: FormAction;
  submitLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-1"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setPending(true);
        setError(null);

        const result = await action(formData);
        setPending(false);

        if (!result.ok) {
          setError(result.message);
          return;
        }

        router.refresh();
      }}
    >
      {children}
      <button
        type="submit"
        disabled={pending}
        className="whitespace-nowrap rounded-md border border-line bg-canvas px-2 py-1 text-xs font-bold text-ink hover:bg-line/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "…" : submitLabel}
      </button>
      {error ? (
        <span role="alert" className="block w-full text-xs font-bold text-red-700">
          {error}
        </span>
      ) : null}
    </form>
  );
}

/**
 * 되돌릴 수 없는 동작을 확인 대화상자로 한 번 더 묻는다.
 * 대화상자는 Escape 로 닫히고 포커스가 안쪽에 갇힌다. (`ModalDialog`)
 *
 * 같은 이름으로 여러 값을 보내야 하는 선택 동작은 `hiddenFields` 값에 배열을 넣는다.
 * 성공했지만 **일부만** 처리된 경우(선택 삭제에서 몇 장이 막힌 경우)는 `onSuccess` 로
 * 결과를 받아 부르는 쪽이 그대로 보여 준다. (AD-015)
 */
export function AdminConfirmButton<TData>({
  action,
  hiddenFields,
  buttonLabel,
  dialogTitle,
  dialogBody,
  confirmLabel,
  tone = "danger",
  disabled = false,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<ActionResult<TData>>;
  hiddenFields: Record<string, string | readonly string[]>;
  buttonLabel: string;
  dialogTitle: string;
  dialogBody: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "normal";
  disabled?: boolean;
  onSuccess?: (data: TData) => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabledClass = "disabled:cursor-not-allowed disabled:opacity-60";
  const buttonClass =
    tone === "danger"
      ? `whitespace-nowrap rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-bold text-red-800 hover:bg-red-100 ${disabledClass}`
      : `whitespace-nowrap rounded-md border border-line bg-canvas px-2 py-1 text-xs font-bold text-ink hover:bg-line/40 ${disabledClass}`;

  async function confirm() {
    const formData = new FormData();
    for (const [key, value] of Object.entries(hiddenFields)) {
      for (const one of Array.isArray(value) ? value : [value as string]) {
        formData.append(key, one);
      }
    }

    setPending(true);
    setError(null);

    const result = await action(formData);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onSuccess?.(result.data);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </button>

      {open ? (
        <ModalDialog open onClose={() => setOpen(false)} titleId={titleId}>
          <div className="px-6 py-6">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {dialogTitle}
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              {dialogBody}
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-canvas"
              >
                돌아가기
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirm}
                className="flex-1 rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "처리 중…" : confirmLabel}
              </button>
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}

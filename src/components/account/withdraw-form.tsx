"use client";

import { useId, useState, type FormEvent } from "react";
import {
  CheckboxField,
  StatusMessage,
  SubmitButton,
  TextField,
} from "@/components/ui/form-controls";
import { withdrawSchema } from "@/lib/contracts";
import { withdrawStub } from "@/lib/data/stubs";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";

/**
 * FM-003 회원 탈퇴.
 * 비밀번호를 다시 확인하고, 기록은 물리 삭제하지 않고 상태로 관리한다. (BLUEPRINT 6장)
 */
export function WithdrawForm() {
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = withdrawSchema.safeParse({
      password: String(formData.get("password") ?? ""),
      confirm: formData.get("confirm") === "on",
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      await withdrawStub();
      setDone(true);
    } catch {
      setFormError("탈퇴를 처리하지 못했습니다. 비밀번호를 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <StatusMessage tone="success">
          탈퇴 처리가 끝났습니다. 그동안 이용해 주셔서 감사합니다.
        </StatusMessage>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-xl border border-line bg-surface p-6"
    >
      <h2 className="text-base font-bold text-ink">회원 탈퇴</h2>
      <p className="text-sm text-muted">
        탈퇴하면 회원 기능을 쓸 수 없습니다. 이미 접수된 신청·예약 내역은 보존 기준에
        따라 따로 관리됩니다.
      </p>

      <TextField
        controlId={`${formId}-password`}
        errorId={errorElementId(formId, "password")}
        name="password"
        label="비밀번호"
        type="password"
        autoComplete="current-password"
        required
        errors={fieldErrors.password}
      />
      <CheckboxField
        controlId={`${formId}-confirm`}
        errorId={errorElementId(formId, "confirm")}
        name="confirm"
        label="위 안내를 확인했고 탈퇴에 동의합니다."
        errors={fieldErrors.confirm}
      />

      {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}

      <SubmitButton pending={submitting}>탈퇴하기</SubmitButton>
    </form>
  );
}

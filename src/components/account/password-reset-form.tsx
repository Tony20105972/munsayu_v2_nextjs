"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { StatusMessage, SubmitButton, TextField } from "@/components/ui/form-controls";
import { PASSWORD_RESET_TOKEN_TTL_MINUTES, resetPasswordSchema } from "@/lib/contracts";
import { resetPasswordAction } from "@/lib/actions/account";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";

/**
 * FM-003 비밀번호 재설정.
 * 재설정 토큰은 메일 링크의 `?token=` 에서 받는다. 1회용이고 유효 시간이 있다.
 * (src/lib/contracts/auth.ts, PASSWORD_RESET_TOKEN_TTL_MINUTES)
 */
export function PasswordResetForm() {
  const formId = useId();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      token,
      password: String(formData.get("password") ?? ""),
      passwordConfirm: String(formData.get("passwordConfirm") ?? ""),
    });

    if (!parsed.success) {
      const errors = toFieldErrors(parsed.error);
      if (errors.token) {
        setFormError(
          "재설정 링크가 올바르지 않습니다. 비밀번호 재설정을 다시 요청해 주세요.",
        );
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const result = await resetPasswordAction(parsed.data);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
        return;
      }

      setDone(true);
    } catch {
      setFormError("비밀번호를 바꾸지 못했습니다. 재설정을 다시 요청해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-5 rounded-xl border border-line bg-surface p-6">
        <StatusMessage tone="success">비밀번호를 바꿨습니다.</StatusMessage>
        <Link
          href="/login"
          className="inline-block rounded-md bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-xl border border-line bg-surface p-6"
    >
      <h2 className="text-base font-bold text-ink">새 비밀번호 설정</h2>
      <p className="text-sm text-muted">
        재설정 링크는 발송 후 {PASSWORD_RESET_TOKEN_TTL_MINUTES}분 동안만 쓸 수
        있습니다.
      </p>

      <TextField
        controlId={`${formId}-password`}
        errorId={errorElementId(formId, "password")}
        name="password"
        label="새 비밀번호"
        type="password"
        hint="영문과 숫자를 함께 넣어 10자 이상으로 만들어 주세요."
        autoComplete="new-password"
        required
        errors={fieldErrors.password}
      />
      <TextField
        controlId={`${formId}-passwordConfirm`}
        errorId={errorElementId(formId, "passwordConfirm")}
        name="passwordConfirm"
        label="새 비밀번호 확인"
        type="password"
        autoComplete="new-password"
        required
        errors={fieldErrors.passwordConfirm}
      />

      {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}

      <SubmitButton pending={submitting}>비밀번호 바꾸기</SubmitButton>
    </form>
  );
}

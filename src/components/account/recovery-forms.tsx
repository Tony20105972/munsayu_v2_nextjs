"use client";

import { useId, useState, type FormEvent } from "react";
import { StatusMessage, SubmitButton, TextField } from "@/components/ui/form-controls";
import { findLoginIdSchema, requestPasswordResetSchema } from "@/lib/contracts";
import { findLoginIdAction, requestPasswordResetAction } from "@/lib/actions/account";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";

/**
 * FM-003 아이디 찾기 / 비밀번호 재설정 요청.
 * 레거시 `/bbs/password_lost.php` 는 로그인 화면의 링크로만 확인했다. (EV-0007)
 * 계정이 있는지 여부는 응답으로 알려 주지 않는다. (src/lib/contracts/auth.ts)
 */

const NEUTRAL_RESULT_MESSAGE =
  "입력하신 정보로 확인할 수 있는 계정이 있으면 안내 메일을 보냈습니다. 메일함을 확인해 주세요.";

export function FindLoginIdForm() {
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parsed = findLoginIdSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    setFormError(null);

    const result = await findLoginIdAction(parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setFormError(result.message);
      return;
    }

    setDone(true);
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-6">
      <h2 className="text-base font-bold text-ink">아이디 찾기</h2>
      <p className="mt-2 text-sm text-muted">
        가입할 때 쓴 이름과 이메일을 넣으면 아이디를 메일로 보내 드립니다.
      </p>

      {done ? (
        <div className="mt-5">
          <StatusMessage tone="info">{NEUTRAL_RESULT_MESSAGE}</StatusMessage>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
          <TextField
            controlId={`${formId}-name`}
            errorId={errorElementId(formId, "name")}
            name="name"
            label="이름"
            autoComplete="name"
            required
            errors={fieldErrors.name}
          />
          <TextField
            controlId={`${formId}-email`}
            errorId={errorElementId(formId, "email")}
            name="email"
            label="이메일"
            type="email"
            autoComplete="email"
            required
            errors={fieldErrors.email}
          />
          {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}

          <SubmitButton pending={submitting}>아이디 찾기</SubmitButton>
        </form>
      )}
    </section>
  );
}

export function RequestPasswordResetForm() {
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parsed = requestPasswordResetSchema.safeParse({
      loginId: String(formData.get("loginId") ?? ""),
      email: String(formData.get("email") ?? ""),
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    setFormError(null);

    const result = await requestPasswordResetAction(parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setFormError(result.message);
      return;
    }

    setDone(true);
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-6">
      <h2 className="text-base font-bold text-ink">비밀번호 재설정 요청</h2>
      <p className="mt-2 text-sm text-muted">
        아이디와 이메일을 넣으면 비밀번호 재설정 링크를 메일로 보내 드립니다.
      </p>

      {done ? (
        <div className="mt-5">
          <StatusMessage tone="info">{NEUTRAL_RESULT_MESSAGE}</StatusMessage>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
          <TextField
            controlId={`${formId}-loginId`}
            errorId={errorElementId(formId, "loginId")}
            name="loginId"
            label="아이디"
            autoComplete="username"
            required
            errors={fieldErrors.loginId}
          />
          <TextField
            controlId={`${formId}-email`}
            errorId={errorElementId(formId, "email")}
            name="email"
            label="이메일"
            type="email"
            autoComplete="email"
            required
            errors={fieldErrors.email}
          />
          {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}

          <SubmitButton pending={submitting}>재설정 링크 받기</SubmitButton>
        </form>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import {
  CheckboxField,
  StatusMessage,
  SubmitButton,
  TextField,
} from "@/components/ui/form-controls";
import { loginSchema } from "@/lib/contracts";
import { loginAction } from "@/lib/actions/account";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";

/**
 * PG-013 회원 로그인.
 * 입력란 안내 문구·`로그인 상태 유지` 체크박스·아이디/비밀번호 찾기 링크는
 * docs/evidence/dom/phase1-login.yml 관찰값이다. (EV-0007)
 */
export function LoginForm() {
  const formId = useId();
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      loginId: String(formData.get("loginId") ?? ""),
      password: String(formData.get("password") ?? ""),
      rememberMe: formData.get("rememberMe") === "on",
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const result = await loginAction(parsed.data);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
        return;
      }

      setDone(true);
      // 관리자 계정은 관리자 화면으로, 회원은 홈으로 보낸다.
      router.replace(result.data.role === "ADMIN" ? "/admin" : "/");
      router.refresh();
    } catch {
      setFormError("아이디 또는 비밀번호를 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-ink">회원 로그인</h2>
        <Link href="/register" className="text-sm font-bold text-brand hover:underline">
          회원가입
        </Link>
      </div>

      {done ? (
        <div className="mt-5">
          <StatusMessage tone="success">로그인했습니다.</StatusMessage>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
          <TextField
            controlId={`${formId}-loginId`}
            errorId={errorElementId(formId, "loginId")}
            name="loginId"
            label="아이디"
            placeholder="아이디를 입력하세요"
            autoComplete="username"
            required
            errors={fieldErrors.loginId}
          />
          <TextField
            controlId={`${formId}-password`}
            errorId={errorElementId(formId, "password")}
            name="password"
            label="비밀번호"
            type="password"
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            required
            errors={fieldErrors.password}
          />
          <CheckboxField
            controlId={`${formId}-rememberMe`}
            errorId={errorElementId(formId, "rememberMe")}
            name="rememberMe"
            label="로그인 상태 유지"
          />

          {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}

          <SubmitButton pending={submitting}>로그인</SubmitButton>
        </form>
      )}

      <p className="mt-5 flex justify-center gap-3 text-sm text-muted">
        <Link
          href="/account/recovery"
          className="font-bold text-ink hover:text-brand hover:underline"
        >
          아이디 찾기
        </Link>
        <span aria-hidden="true">|</span>
        <Link
          href="/account/recovery"
          className="font-bold text-ink hover:text-brand hover:underline"
        >
          비밀번호 찾기
        </Link>
      </p>
    </div>
  );
}

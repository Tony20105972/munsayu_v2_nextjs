"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { adminLoginAction } from "@/lib/actions/account";
import { loginSchema } from "@/lib/contracts";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";

/**
 * AD-001 관리자 로그인 폼.
 *
 * 회원 로그인(`/login`)과 다른 화면이고, 관리자 역할이 아닌 계정은 통과하지 못한다.
 * 관리자 세션은 회원 세션과 다른 쿠키를 쓴다. (BLUEPRINT 7장)
 */
export function AdminLoginForm() {
  const formId = useId();
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    setPending(true);

    const result = await adminLoginAction(parsed.data);
    setPending(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setFormError(result.message);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label
          htmlFor={`${formId}-loginId`}
          className="block text-sm font-bold text-ink"
        >
          관리자 아이디
        </label>
        <input
          id={`${formId}-loginId`}
          name="loginId"
          type="text"
          autoComplete="username"
          aria-invalid={Boolean(fieldErrors.loginId) || undefined}
          aria-describedby={
            fieldErrors.loginId ? errorElementId(formId, "loginId") : undefined
          }
          className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink"
        />
        {fieldErrors.loginId ? (
          <p
            id={errorElementId(formId, "loginId")}
            className="mt-1.5 text-xs font-bold text-red-700"
          >
            {fieldErrors.loginId.join(" ")}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor={`${formId}-password`}
          className="block text-sm font-bold text-ink"
        >
          비밀번호
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(fieldErrors.password) || undefined}
          aria-describedby={
            fieldErrors.password ? errorElementId(formId, "password") : undefined
          }
          className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink"
        />
        {fieldErrors.password ? (
          <p
            id={errorElementId(formId, "password")}
            className="mt-1.5 text-xs font-bold text-red-700"
          >
            {fieldErrors.password.join(" ")}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`${formId}-rememberMe`}
          name="rememberMe"
          type="checkbox"
          className="size-4 accent-brand"
        />
        <label htmlFor={`${formId}-rememberMe`} className="text-sm text-ink">
          로그인 상태 유지
        </label>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800"
        >
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "확인 중…" : "관리자 로그인"}
      </button>
    </form>
  );
}

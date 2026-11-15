"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { StatusMessage, SubmitButton, TextField } from "@/components/ui/form-controls";
import { changePasswordSchema } from "@/lib/contracts";
import { changeAdminPasswordAction } from "@/lib/actions/admin";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";

/**
 * AD-016 관리자 본인 비밀번호 바꾸기.
 *
 * 회원 쪽 화면(`ChangePasswordForm`)과 모양은 같지만 **관리자 세션**을 쓰는 다른
 * Action 을 부른다. 회원 Action 은 회원 쿠키만 보기 때문에 관리자가 쓸 수 없다.
 *
 * 성공하면 **이 창의 로그인도 끊긴다.** 서비스가 그 계정의 세션을 모두 지우기 때문이다.
 * 그래서 성공 뒤에는 관리자 로그인 화면으로 보낸다. 쿠키가 지워져 레이아웃이 어차피
 * 돌려보내지만, 그 되돌림에 기대지 않고 우리가 직접 보낸다.
 */
export function AdminChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const router = useRouter();
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = changePasswordSchema.safeParse({
      currentPassword: String(formData.get("currentPassword") ?? ""),
      password: String(formData.get("password") ?? ""),
      passwordConfirm: String(formData.get("passwordConfirm") ?? ""),
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.set("currentPassword", parsed.data.currentPassword);
      payload.set("password", parsed.data.password);
      payload.set("passwordConfirm", parsed.data.passwordConfirm);

      const result = await changeAdminPasswordAction(payload);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
        return;
      }

      router.replace("/admin/login");
    } catch {
      setFormError("비밀번호를 바꾸지 못했습니다. 현재 비밀번호를 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-xl border border-line bg-surface p-6"
    >
      {forced ? (
        <StatusMessage tone="error">
          임시 비밀번호로 들어왔습니다. 비밀번호를 바꾸기 전에는 다른 화면을 쓸 수
          없습니다.
        </StatusMessage>
      ) : null}

      <TextField
        controlId={`${formId}-currentPassword`}
        errorId={errorElementId(formId, "currentPassword")}
        name="currentPassword"
        label={forced ? "지금 쓰는 임시 비밀번호" : "현재 비밀번호"}
        type="password"
        autoComplete="current-password"
        required
        errors={fieldErrors.currentPassword}
      />
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

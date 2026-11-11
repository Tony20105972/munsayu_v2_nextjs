"use client";

import { useId, useState, type FormEvent } from "react";
import { StatusMessage, SubmitButton, TextField } from "@/components/ui/form-controls";
import { changePasswordSchema, updateProfileSchema } from "@/lib/contracts";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/account";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";

/**
 * FM-003 회원 정보 수정 / 비밀번호 변경.
 * 레거시에서 관찰하지 못한 화면이라 계약(`updateProfileSchema`, `changePasswordSchema`)만 따른다. // ASM-055
 */

type UpdateProfileFormProps = {
  defaultName: string;
  /**
   * 현재 이메일·휴대전화번호를 읽는 공개 경로가 없어 지금은 비워 둔다.
   * BE 가 `GET /api/account/profile` 을 만들면 값만 넘기면 된다. // ASM-074
   */
  defaultEmail?: string;
  defaultPhone?: string;
};

export function UpdateProfileForm({
  defaultName,
  defaultEmail,
  defaultPhone,
}: UpdateProfileFormProps) {
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaved(false);

    const formData = new FormData(event.currentTarget);
    const parsed = updateProfileSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const result = await updateProfileAction(parsed.data);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
        return;
      }

      setSaved(true);
    } catch {
      setFormError("정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
      <h2 className="text-base font-bold text-ink">회원 정보 수정</h2>

      <TextField
        controlId={`${formId}-name`}
        errorId={errorElementId(formId, "name")}
        name="name"
        label="이름"
        autoComplete="name"
        defaultValue={defaultName}
        required
        errors={fieldErrors.name}
      />
      <TextField
        controlId={`${formId}-email`}
        errorId={errorElementId(formId, "email")}
        name="email"
        label="이메일"
        type="email"
        hint="저장할 때 세 항목을 모두 함께 반영하므로 현재 이메일도 다시 입력해 주세요."
        autoComplete="email"
        defaultValue={defaultEmail}
        required
        errors={fieldErrors.email}
      />
      <TextField
        controlId={`${formId}-phone`}
        errorId={errorElementId(formId, "phone")}
        name="phone"
        label="휴대전화번호"
        type="tel"
        inputMode="tel"
        placeholder="010-0000-0000"
        autoComplete="tel"
        defaultValue={defaultPhone}
        required
        errors={fieldErrors.phone}
      />

      {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}
      {saved ? <StatusMessage tone="success">저장했습니다.</StatusMessage> : null}

      <SubmitButton pending={submitting}>정보 저장</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaved(false);

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
      const result = await changePasswordAction(parsed.data);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
        return;
      }

      setSaved(true);
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
      <h2 className="text-base font-bold text-ink">비밀번호 변경</h2>

      <TextField
        controlId={`${formId}-currentPassword`}
        errorId={errorElementId(formId, "currentPassword")}
        name="currentPassword"
        label="현재 비밀번호"
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
      {saved ? (
        <StatusMessage tone="success">
          비밀번호를 바꿨습니다. 안전을 위해 기존 로그인이 모두 끊겼으니 새 비밀번호로
          다시 로그인해 주세요.
        </StatusMessage>
      ) : null}

      <SubmitButton pending={submitting}>비밀번호 바꾸기</SubmitButton>
    </form>
  );
}

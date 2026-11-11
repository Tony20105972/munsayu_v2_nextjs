"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import {
  CheckboxField,
  StatusMessage,
  SubmitButton,
  TextField,
} from "@/components/ui/form-controls";
import { registerSchema } from "@/lib/contracts";
import { registerAction } from "@/lib/actions/account";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";

/**
 * PG-014 회원가입.
 * 1단계 약관·개인정보 동의 화면은 docs/evidence/dom/phase1-register.yml 관찰값 그대로다. (EV-0007)
 * 레거시 2단계(가입 입력)는 동의·다음 클릭 금지로 관찰하지 못해 `registerSchema` 로 구성했다. // ASM-055
 */

/** 레거시 약관 상자에 들어 있던 문구 원문. 실제 약관은 아직 비어 있다. (EV-0007) */
const TERMS_PLACEHOLDER_TEXT = "해당 홈페이지에 맞는 회원가입약관을 입력합니다.";

const PRIVACY_ROWS = [
  {
    purpose: "이용자 식별 및 본인여부 확인",
    items: "아이디, 이름, 비밀번호",
    retention: "회원 탈퇴 시까지",
  },
  {
    purpose: "고객서비스 통지 및 CS 대응 식별",
    items: "연락처 (이메일, 휴대전화번호)",
    retention: "회원 탈퇴 시까지",
  },
] as const;

export function RegisterFlow() {
  const formId = useId();
  const [step, setStep] = useState<1 | 2>(1);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const allChecked = termsChecked && privacyChecked;

  function handleNext() {
    if (!allChecked) {
      setConsentError("회원가입약관과 개인정보 수집 및 이용에 모두 동의해야 합니다.");
      return;
    }

    setConsentError(null);
    setStep(2);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      loginId: String(formData.get("loginId") ?? ""),
      password: String(formData.get("password") ?? ""),
      passwordConfirm: String(formData.get("passwordConfirm") ?? ""),
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      termsConsent: termsChecked,
      privacyConsent: privacyChecked,
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const result = await registerAction(parsed.data);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
        return;
      }

      setDone(true);
    } catch {
      setFormError("가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-5 rounded-xl border border-line bg-surface p-6">
        <StatusMessage tone="success">회원가입이 완료되었습니다.</StatusMessage>
        <Link
          href="/login"
          className="inline-block rounded-md bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <p className="rounded-md border border-line bg-surface px-5 py-4 text-sm text-muted">
          회원가입약관 및 개인정보 수집·이용 동의를 완료하셔야 다음 가입 단계 진행이
          가능합니다.
        </p>

        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-base font-bold text-ink">(필수) 회원가입약관</h2>
          {/* 레거시 약관 상자에는 아직 실제 약관이 아니라 안내 문구만 들어 있었다. // ASM-056 */}
          <div className="mt-4 h-40 overflow-y-auto rounded-md border border-line bg-canvas px-4 py-3 text-sm text-muted">
            {TERMS_PLACEHOLDER_TEXT}
          </div>
          <div className="mt-4">
            <CheckboxField
              controlId={`${formId}-terms`}
              errorId={errorElementId(formId, "terms")}
              name="termsConsent"
              label="회원가입약관의 내용에 동의합니다."
              checked={termsChecked}
              onChange={(checked) => {
                setTermsChecked(checked);
                if (checked) {
                  setConsentError(null);
                }
              }}
            />
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-base font-bold text-ink">(필수) 개인정보 수집 및 이용</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-md border-collapse text-sm">
              <caption className="sr-only">개인정보 수집 및 이용 안내</caption>
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="py-3 pr-4 font-bold">
                    목적
                  </th>
                  <th scope="col" className="py-3 pr-4 font-bold">
                    항목
                  </th>
                  <th scope="col" className="py-3 font-bold">
                    보유기간
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRIVACY_ROWS.map((row) => (
                  <tr key={row.purpose} className="border-b border-line">
                    <th scope="row" className="py-3 pr-4 text-left font-bold text-ink">
                      {row.purpose}
                    </th>
                    <td className="py-3 pr-4 text-muted">{row.items}</td>
                    <td className="py-3 text-muted">{row.retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <CheckboxField
              controlId={`${formId}-privacy`}
              errorId={errorElementId(formId, "privacy")}
              name="privacyConsent"
              label="개인정보 수집 및 이용의 내용에 동의합니다."
              checked={privacyChecked}
              onChange={(checked) => {
                setPrivacyChecked(checked);
                if (checked) {
                  setConsentError(null);
                }
              }}
            />
          </div>
        </section>

        <div className="rounded-xl border border-line bg-surface p-6">
          <div className="flex items-start gap-2">
            <input
              id={`${formId}-all`}
              type="checkbox"
              checked={allChecked}
              onChange={(event) => {
                const { checked } = event.currentTarget;
                setTermsChecked(checked);
                setPrivacyChecked(checked);
                if (checked) {
                  setConsentError(null);
                }
              }}
              className="mt-0.5 size-4 accent-brand"
            />
            <label htmlFor={`${formId}-all`} className="text-sm font-bold text-ink">
              문사유 아카데미 회원가입 약관에 모두 동의합니다.
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">
            위 두 항목의 체크 상태와 함께 바뀝니다. 각 항목을 따로 체크해도 됩니다.
          </p>
        </div>

        {consentError ? (
          <StatusMessage tone="error">{consentError}</StatusMessage>
        ) : null}

        <div className="flex gap-3">
          <Link
            href="/"
            className="flex-1 rounded-md border border-line bg-surface px-5 py-3 text-center text-sm font-bold text-ink hover:bg-canvas"
          >
            취소하기
          </Link>
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 rounded-md bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark"
          >
            다음
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-xl border border-line bg-surface p-6"
    >
      <h2 className="text-base font-bold text-ink">회원 정보 입력</h2>

      <TextField
        controlId={`${formId}-loginId`}
        errorId={errorElementId(formId, "loginId")}
        name="loginId"
        label="아이디"
        hint="영문 소문자, 숫자, 밑줄만 쓸 수 있습니다."
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
        hint="영문과 숫자를 함께 넣어 10자 이상으로 만들어 주세요."
        autoComplete="new-password"
        required
        errors={fieldErrors.password}
      />
      <TextField
        controlId={`${formId}-passwordConfirm`}
        errorId={errorElementId(formId, "passwordConfirm")}
        name="passwordConfirm"
        label="비밀번호 확인"
        type="password"
        autoComplete="new-password"
        required
        errors={fieldErrors.passwordConfirm}
      />
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
      <TextField
        controlId={`${formId}-phone`}
        errorId={errorElementId(formId, "phone")}
        name="phone"
        label="휴대전화번호"
        type="tel"
        inputMode="tel"
        placeholder="010-0000-0000"
        autoComplete="tel"
        required
        errors={fieldErrors.phone}
      />

      {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex-1 rounded-md border border-line bg-surface px-5 py-3 text-sm font-bold text-ink hover:bg-canvas"
        >
          이전 단계
        </button>
        <div className="flex-1">
          <SubmitButton pending={submitting}>가입하기</SubmitButton>
        </div>
      </div>
    </form>
  );
}

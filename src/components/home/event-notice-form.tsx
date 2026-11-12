"use client";

import { useId, useState, type FormEvent } from "react";
import {
  CheckboxField,
  SelectField,
  StatusMessage,
  SubmitButton,
  TextField,
} from "@/components/ui/form-controls";
import {
  ELEMENTARY_GRADES,
  SMS_SUBSCRIPTION_CONSENT,
  smsSubscriptionSchema,
} from "@/lib/contracts";
import { submitSmsSubscriptionAction } from "@/lib/actions/public-forms";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";
import { createIdempotencyKey } from "@/lib/idempotency";

/**
 * AD-010 설명회 알림 신청 폼 (홈 하단).
 *
 * 레거시 메인 하단에 같은 자리, 같은 항목(학년·학생 이름·학교명·보호자 연락처)의 폼이
 * 있었고 `POST ./sms_subscribe.ajax.php` 로 보냈다. (EV-0003)
 * 레거시에는 없던 개인정보·알림 수신 동의를 새로 둔다. // ASM-086
 * **문자 발송은 하지 않는다.** 신청 내역만 남기고 직원이 직접 연락한다. (D4)
 */
export function EventNoticeForm({
  retentionPolicy,
}: {
  /** 관리자 보존 설정의 현재 문구. 「보유기간」은 이 값을 보여 준다. (BZ-002) */
  retentionPolicy: string;
}) {
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [idempotencyKey] = useState(createIdempotencyKey);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = smsSubscriptionSchema.safeParse({
      grade: String(formData.get("grade") ?? ""),
      studentName: String(formData.get("studentName") ?? ""),
      schoolName: String(formData.get("schoolName") ?? ""),
      guardianPhone: String(formData.get("guardianPhone") ?? ""),
      privacyConsent: formData.get("privacyConsent") === "on",
      notifyConsent: formData.get("notifyConsent") === "on",
      idempotencyKey,
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const result = await submitSmsSubscriptionAction(parsed.data);
      if (result.ok) {
        setSubmitted(true);
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
      }
    } catch {
      setFormError("신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <StatusMessage tone="success">
        알림 신청이 접수되었습니다. 설명회 일정이 정해지면 남겨 주신 연락처로
        안내드리겠습니다.
      </StatusMessage>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
      <SelectField
        controlId={`${formId}-grade`}
        errorId={errorElementId(formId, "grade")}
        name="grade"
        label="학년"
        placeholder="학년을 선택하세요"
        required
        errors={fieldErrors.grade}
        options={ELEMENTARY_GRADES.map((value) => ({ value, label: value }))}
      />
      <TextField
        controlId={`${formId}-studentName`}
        errorId={errorElementId(formId, "studentName")}
        name="studentName"
        label="학생 이름"
        autoComplete="off"
        required
        errors={fieldErrors.studentName}
      />
      <TextField
        controlId={`${formId}-schoolName`}
        errorId={errorElementId(formId, "schoolName")}
        name="schoolName"
        label="학교명"
        autoComplete="off"
        required
        errors={fieldErrors.schoolName}
      />
      <TextField
        controlId={`${formId}-guardianPhone`}
        errorId={errorElementId(formId, "guardianPhone")}
        name="guardianPhone"
        label="보호자 연락처"
        type="tel"
        inputMode="tel"
        placeholder="010-0000-0000"
        autoComplete="off"
        required
        errors={fieldErrors.guardianPhone}
      />

      <section className="rounded-md border border-line bg-canvas px-4 py-4">
        <h3 className="text-sm font-bold text-ink">
          {SMS_SUBSCRIPTION_CONSENT.heading}
        </h3>
        <dl className="mt-3 space-y-1 text-xs leading-relaxed text-muted">
          <div>
            <dt className="inline font-bold text-ink">목적 : </dt>
            <dd className="inline">{SMS_SUBSCRIPTION_CONSENT.purpose}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-ink">수집항목 : </dt>
            <dd className="inline">{SMS_SUBSCRIPTION_CONSENT.collectedItems}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-ink">보유기간 : </dt>
            <dd className="inline">{retentionPolicy}</dd>
          </div>
        </dl>
        <div className="mt-4 space-y-2">
          <CheckboxField
            controlId={`${formId}-privacyConsent`}
            errorId={errorElementId(formId, "privacyConsent")}
            name="privacyConsent"
            label={SMS_SUBSCRIPTION_CONSENT.checkboxLabel}
            errors={fieldErrors.privacyConsent}
          />
          <CheckboxField
            controlId={`${formId}-notifyConsent`}
            errorId={errorElementId(formId, "notifyConsent")}
            name="notifyConsent"
            label={SMS_SUBSCRIPTION_CONSENT.notifyCheckboxLabel}
            errors={fieldErrors.notifyConsent}
          />
        </div>
      </section>

      {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}

      <SubmitButton pending={submitting}>
        {SMS_SUBSCRIPTION_CONSENT.submitLabel}
      </SubmitButton>
    </form>
  );
}

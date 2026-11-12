"use client";

import { useId, useState, type FormEvent } from "react";
import {
  CheckboxField,
  CheckboxGroupField,
  FileField,
  SelectField,
  StatusMessage,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/ui/form-controls";
import {
  INSTRUCTOR_CAPABILITIES,
  INSTRUCTOR_EXPERIENCE_OPTIONS,
  INSTRUCTOR_PRIVACY_CONSENT,
  INSTRUCTOR_SPECIALTIES,
  RESUME_FORMAT_LABEL,
  instructorApplicationSchema,
} from "@/lib/contracts";
import { submitInstructorApplicationAction } from "@/lib/actions/public-forms";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";
import { createIdempotencyKey } from "@/lib/idempotency";

/**
 * AD-011 강사 지원서 (`/sub/Recruit`).
 *
 * 항목·선택지·버튼 문구는 레거시 공개 화면을 관찰한 그대로다. (EV-0014)
 * 제출 서류는 서버가 **파일 내용**으로 형식을 확인하고 비공개 영역에 저장한다. // ASM-085
 */
export function RecruitForm({
  retentionPolicy,
  maxBytes,
}: {
  /** 관리자 보존 설정의 현재 문구. 「보유기간」은 이 값을 보여 준다. (BZ-002) */
  retentionPolicy: string;
  maxBytes: number;
}) {
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [idempotencyKey] = useState(createIdempotencyKey);

  const maxMb = Math.floor(maxBytes / (1024 * 1024));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const parsed = instructorApplicationSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      education: String(formData.get("education") ?? ""),
      experienceYears: String(formData.get("experienceYears") ?? ""),
      specialties: formData.getAll("specialties").map(String),
      capabilities: formData.getAll("capabilities").map(String),
      headline: String(formData.get("headline") ?? ""),
      careerDetail: String(formData.get("careerDetail") ?? ""),
      coachingDetail: String(formData.get("coachingDetail") ?? ""),
      privacyConsent: formData.get("privacyConsent") === "on",
      idempotencyKey,
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    const resume = formData.get("resume");
    if (!(resume instanceof File) || resume.size === 0) {
      setFieldErrors({ resume: ["이력서 및 자기소개서 파일을 올려 주세요."] });
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      // 검증을 통과한 값으로 다시 만들어 보낸다. 서버에서도 같은 계약으로 또 검증한다.
      const payload = new FormData();
      for (const [key, value] of Object.entries(parsed.data)) {
        if (Array.isArray(value)) {
          for (const item of value) payload.append(key, item);
        } else {
          payload.append(key, String(value));
        }
      }
      payload.set("resume", resume);
      const portfolio = formData.get("portfolio");
      if (portfolio instanceof File && portfolio.size > 0) {
        payload.set("portfolio", portfolio);
      }

      const result = await submitInstructorApplicationAction(payload);
      if (result.ok) {
        setSubmitted(true);
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
      }
    } catch {
      setFormError("지원서를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <StatusMessage tone="success">
        지원서가 접수되었습니다. 서류 검토 후 남겨 주신 연락처로 안내드리겠습니다.
      </StatusMessage>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <TextField
        controlId={`${formId}-name`}
        errorId={errorElementId(formId, "name")}
        name="name"
        label="강사명 (실명)"
        autoComplete="off"
        required
        errors={fieldErrors.name}
      />
      <TextField
        controlId={`${formId}-phone`}
        errorId={errorElementId(formId, "phone")}
        name="phone"
        label="연락처"
        type="tel"
        inputMode="tel"
        placeholder="010-0000-0000"
        autoComplete="off"
        required
        errors={fieldErrors.phone}
      />
      <TextField
        controlId={`${formId}-email`}
        errorId={errorElementId(formId, "email")}
        name="email"
        label="이메일 주소"
        type="email"
        autoComplete="off"
        required
        errors={fieldErrors.email}
      />
      <TextField
        controlId={`${formId}-education`}
        errorId={errorElementId(formId, "education")}
        name="education"
        label="최종 학력"
        hint="학교·전공·졸업 여부를 적어 주세요."
        required
        errors={fieldErrors.education}
      />
      <SelectField
        controlId={`${formId}-experienceYears`}
        errorId={errorElementId(formId, "experienceYears")}
        name="experienceYears"
        label="논술 강의 총 경력 연수"
        placeholder="경력을 선택하세요"
        required
        errors={fieldErrors.experienceYears}
        options={INSTRUCTOR_EXPERIENCE_OPTIONS.map((value) => ({
          value,
          label: value,
        }))}
      />
      <CheckboxGroupField
        name="specialties"
        legend="강의 가능 전문 분과"
        idPrefix={`${formId}-specialties`}
        errorId={errorElementId(formId, "specialties")}
        hint="여러 개를 고를 수 있습니다."
        required
        errors={fieldErrors.specialties}
        options={INSTRUCTOR_SPECIALTIES.map((value) => ({ value, label: value }))}
      />
      <CheckboxGroupField
        name="capabilities"
        legend="핵심 역량 지표"
        idPrefix={`${formId}-capabilities`}
        errorId={errorElementId(formId, "capabilities")}
        hint="여러 개를 고를 수 있습니다."
        required
        errors={fieldErrors.capabilities}
        options={INSTRUCTOR_CAPABILITIES.map((value) => ({ value, label: value }))}
      />
      <TextField
        controlId={`${formId}-headline`}
        errorId={errorElementId(formId, "headline")}
        name="headline"
        label="한 줄 자기소개"
        required
        errors={fieldErrors.headline}
      />
      <TextAreaField
        controlId={`${formId}-careerDetail`}
        errorId={errorElementId(formId, "careerDetail")}
        name="careerDetail"
        label="주요 경력 / 합격 수치"
        rows={5}
        required
        errors={fieldErrors.careerDetail}
      />
      <TextAreaField
        controlId={`${formId}-coachingDetail`}
        errorId={errorElementId(formId, "coachingDetail")}
        name="coachingDetail"
        label="첨삭·리라이팅 노하우"
        rows={5}
        required
        errors={fieldErrors.coachingDetail}
      />

      <FileField
        controlId={`${formId}-resume`}
        errorId={errorElementId(formId, "resume")}
        name="resume"
        label="이력서 및 자기소개서"
        hint={`${RESUME_FORMAT_LABEL} 형식, ${maxMb}MB 이하`}
        accept=".pdf,.docx,.hwp,.hwpx"
        required
        errors={fieldErrors.resume}
      />
      <FileField
        controlId={`${formId}-portfolio`}
        errorId={errorElementId(formId, "portfolio")}
        name="portfolio"
        label="교재 · 기출 해제안 (선택)"
        hint={`${RESUME_FORMAT_LABEL} 형식, ${maxMb}MB 이하`}
        accept=".pdf,.docx,.hwp,.hwpx"
        errors={fieldErrors.portfolio}
      />

      <section className="rounded-md border border-line bg-canvas px-4 py-4">
        <h3 className="text-sm font-bold text-ink">
          {INSTRUCTOR_PRIVACY_CONSENT.heading}
        </h3>
        <dl className="mt-3 space-y-1 text-xs leading-relaxed text-muted">
          <div>
            <dt className="inline font-bold text-ink">목적 : </dt>
            <dd className="inline">{INSTRUCTOR_PRIVACY_CONSENT.purpose}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-ink">수집항목 : </dt>
            <dd className="inline">{INSTRUCTOR_PRIVACY_CONSENT.collectedItems}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-ink">보유기간 : </dt>
            <dd className="inline">{retentionPolicy}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <CheckboxField
            controlId={`${formId}-privacyConsent`}
            errorId={errorElementId(formId, "privacyConsent")}
            name="privacyConsent"
            label={INSTRUCTOR_PRIVACY_CONSENT.checkboxLabel}
            errors={fieldErrors.privacyConsent}
          />
        </div>
      </section>

      {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}

      <SubmitButton pending={submitting}>
        {INSTRUCTOR_PRIVACY_CONSENT.submitLabel}
      </SubmitButton>
    </form>
  );
}

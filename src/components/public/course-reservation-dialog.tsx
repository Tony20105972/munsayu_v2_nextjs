"use client";

import { useId, useState, type FormEvent } from "react";
import {
  CheckboxField,
  RadioGroupField,
  StatusMessage,
  SubmitButton,
  TextField,
} from "@/components/ui/form-controls";
import { ModalDialog } from "@/components/ui/modal-dialog";
import {
  COURSE_DEPARTMENTS,
  COURSE_PRIVACY_CONSENT,
  ELEMENTARY_GRADES,
  courseApplicationSchema,
} from "@/lib/contracts";
import { submitCourseApplicationStub, type CourseSummary } from "@/lib/data/stubs";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";
import { createIdempotencyKey } from "@/lib/idempotency";

type CourseReservationDialogProps = {
  course: CourseSummary;
  onClose: () => void;
};

/**
 * FM-001 수강 예약 신청 모달.
 * 제목·입력란 안내 문구·선택지·동의 문구·버튼 문구는 레거시 관찰값이고,
 * 문구 원본은 `src/lib/contracts/applications.ts` 의 상수를 그대로 쓴다. (EV-0006, EV-0010)
 */
export function CourseReservationDialog({
  course,
  onClose,
}: CourseReservationDialogProps) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // 같은 신청서를 다시 보낼 때도 같은 키를 쓴다. 폼을 새로 열면 새 키가 만들어진다.
  const [idempotencyKey] = useState(createIdempotencyKey);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const department = String(formData.get("department") ?? "");
    const grade = String(formData.get("grade") ?? "");

    const missing: FieldErrors = {};
    if (department === "") {
      missing.department = ["희망 수강 과정을 선택해 주세요."];
    }
    if (grade === "") {
      missing.grade = ["초등 학년을 선택해 주세요."];
    }
    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      return;
    }

    const parsed = courseApplicationSchema.safeParse({
      courseId: course.id,
      studentName: String(formData.get("studentName") ?? ""),
      guardianPhone: String(formData.get("guardianPhone") ?? ""),
      schoolName: String(formData.get("schoolName") ?? ""),
      department,
      grade,
      privacyConsent: formData.get("privacyConsent") === "on",
      idempotencyKey,
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      await submitCourseApplicationStub(parsed.data);
      setSubmitted(true);
    } catch {
      setFormError("신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog open onClose={onClose} titleId={titleId}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <h2 id={titleId} className="text-lg font-bold text-ink">
          {course.campusName} 수강 예약 신청
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line px-3 py-1.5 text-sm font-bold text-muted hover:bg-canvas"
        >
          닫기
        </button>
      </div>

      <div className="px-6 py-5">
        <div className="rounded-md border border-line bg-canvas px-4 py-3 text-sm">
          <p className="font-bold text-ink">선택한 강좌 정보 [{course.campusName}]</p>
          <p className="mt-1 text-ink">
            {course.sectionTitle} - {course.title}
          </p>
          <p className="mt-1 text-muted">
            강의시간: {course.scheduleText} | 개강일: {course.startDateText}
          </p>
        </div>

        {submitted ? (
          <div className="mt-5 space-y-4">
            <StatusMessage tone="success">
              수강 예약 신청이 접수되었습니다. 확인 후 안내해 드립니다.
            </StatusMessage>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark"
            >
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
            <TextField
              controlId={`${formId}-studentName`}
              errorId={errorElementId(formId, "studentName")}
              name="studentName"
              label="학생 이름"
              placeholder="실명을 입력하세요"
              autoComplete="off"
              required
              errors={fieldErrors.studentName}
            />
            <TextField
              controlId={`${formId}-guardianPhone`}
              errorId={errorElementId(formId, "guardianPhone")}
              name="guardianPhone"
              label="학부모 연락처"
              type="tel"
              inputMode="tel"
              placeholder="010-0000-0000"
              autoComplete="off"
              required
              errors={fieldErrors.guardianPhone}
            />
            <TextField
              controlId={`${formId}-schoolName`}
              errorId={errorElementId(formId, "schoolName")}
              name="schoolName"
              label="재학 중인 초등학교명"
              placeholder="예) 대치초등학교"
              autoComplete="off"
              required
              errors={fieldErrors.schoolName}
            />

            <RadioGroupField
              name="department"
              legend="희망 수강 과정"
              idPrefix={`${formId}-department`}
              errorId={errorElementId(formId, "department")}
              required
              errors={fieldErrors.department}
              options={COURSE_DEPARTMENTS.map((value) => ({ value, label: value }))}
            />

            <RadioGroupField
              name="grade"
              legend="초등 학년 선택"
              idPrefix={`${formId}-grade`}
              errorId={errorElementId(formId, "grade")}
              required
              errors={fieldErrors.grade}
              options={ELEMENTARY_GRADES.map((value) => ({ value, label: value }))}
            />

            <section className="rounded-md border border-line bg-canvas px-4 py-4">
              <h3 className="text-sm font-bold text-ink">
                {COURSE_PRIVACY_CONSENT.heading}
              </h3>
              <dl className="mt-3 space-y-1 text-xs leading-relaxed text-muted">
                <div>
                  <dt className="inline font-bold text-ink">목적 : </dt>
                  <dd className="inline">{COURSE_PRIVACY_CONSENT.purpose}</dd>
                </div>
                <div>
                  <dt className="inline font-bold text-ink">수집항목 : </dt>
                  <dd className="inline">{COURSE_PRIVACY_CONSENT.collectedItems}</dd>
                </div>
                <div>
                  <dt className="inline font-bold text-ink">보유기간 : </dt>
                  <dd className="inline">{COURSE_PRIVACY_CONSENT.retention}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <CheckboxField
                  controlId={`${formId}-privacyConsent`}
                  errorId={errorElementId(formId, "privacyConsent")}
                  name="privacyConsent"
                  label={COURSE_PRIVACY_CONSENT.checkboxLabel}
                  errors={fieldErrors.privacyConsent}
                />
              </div>
            </section>

            {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}

            <SubmitButton pending={submitting}>
              {COURSE_PRIVACY_CONSENT.submitLabel}
            </SubmitButton>
          </form>
        )}
      </div>
    </ModalDialog>
  );
}

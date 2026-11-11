"use client";

import { useId, useState, type FormEvent } from "react";
import {
  CheckboxField,
  RadioGroupField,
  SelectField,
  StatusMessage,
  SubmitButton,
  TextField,
} from "@/components/ui/form-controls";
import { ModalDialog } from "@/components/ui/modal-dialog";
import {
  ELEMENTARY_GRADES,
  EVENT_ATTENDEE_MAX,
  eventReservationSchema,
} from "@/lib/contracts";
import { submitEventReservationAction } from "@/lib/actions/public-forms";
import { EVENT_PRIVACY_CONSENT } from "@/lib/event-consent";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";
import { createIdempotencyKey } from "@/lib/idempotency";
import type { EventCardView } from "@/lib/view-models";

type EventReservationDialogProps = {
  event: EventCardView;
  onClose: () => void;
};

const ATTENDEE_OPTIONS = Array.from({ length: EVENT_ATTENDEE_MAX }, (_, index) => {
  const value = String(index + 1);
  return { value, label: `${value}명` };
});

/**
 * FM-002 설명회 예약 신청 모달.
 * 레거시 폼을 관찰하지 못해 Phase 2 계약(`eventReservationSchema`, D9)에 맞춘 신규 설계다.
 * 참석 인원 상한은 1건 최대 2명이다. (ASM-001)
 */
export function EventReservationDialog({
  event,
  onClose,
}: EventReservationDialogProps) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [idempotencyKey] = useState(createIdempotencyKey);

  async function handleSubmit(event_: FormEvent<HTMLFormElement>) {
    event_.preventDefault();
    setFormError(null);

    const formData = new FormData(event_.currentTarget);
    const attendeeCount = String(formData.get("attendeeCount") ?? "");

    if (attendeeCount === "") {
      setFieldErrors({ attendeeCount: ["참석 인원을 선택해 주세요."] });
      return;
    }

    const parsed = eventReservationSchema.safeParse({
      eventId: event.id,
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      grade: String(formData.get("grade") ?? ""),
      attendeeCount,
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
      // 서버에서 같은 계약 스키마로 다시 검증한다. 클라이언트 결과는 신뢰하지 않는다.
      const result = await submitEventReservationAction(parsed.data);
      if (result.ok) {
        setSubmitted(true);
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
      }
    } catch {
      setFormError("예약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog open onClose={onClose} titleId={titleId}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <h2 id={titleId} className="text-lg font-bold text-ink">
          {event.campusName} 설명회 예약 신청
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
          <p className="font-bold text-ink">선택한 설명회 정보 [{event.campusName}]</p>
          <p className="mt-1 text-ink">{event.title}</p>
          <p className="mt-1 text-muted">
            일시: {event.startsAtText} | 장소: {event.venueName}
          </p>
        </div>

        {submitted ? (
          <div className="mt-5 space-y-4">
            <StatusMessage tone="success">
              설명회 예약이 접수되었습니다. 예약 확인·취소는 예약 확인 화면에서 할 수
              있습니다.
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
              controlId={`${formId}-name`}
              errorId={errorElementId(formId, "name")}
              name="name"
              label="이름"
              placeholder="실명을 입력하세요"
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
            <RadioGroupField
              name="attendeeCount"
              legend="참석 인원"
              idPrefix={`${formId}-attendeeCount`}
              errorId={errorElementId(formId, "attendeeCount")}
              required
              defaultValue="1"
              errors={fieldErrors.attendeeCount}
              options={ATTENDEE_OPTIONS}
            />

            <section className="rounded-md border border-line bg-canvas px-4 py-4">
              <h3 className="text-sm font-bold text-ink">
                {EVENT_PRIVACY_CONSENT.heading}
              </h3>
              <dl className="mt-3 space-y-1 text-xs leading-relaxed text-muted">
                <div>
                  <dt className="inline font-bold text-ink">목적 : </dt>
                  <dd className="inline">{EVENT_PRIVACY_CONSENT.purpose}</dd>
                </div>
                <div>
                  <dt className="inline font-bold text-ink">수집항목 : </dt>
                  <dd className="inline">{EVENT_PRIVACY_CONSENT.collectedItems}</dd>
                </div>
                <div>
                  <dt className="inline font-bold text-ink">보유기간 : </dt>
                  <dd className="inline">{EVENT_PRIVACY_CONSENT.retention}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <CheckboxField
                  controlId={`${formId}-privacyConsent`}
                  errorId={errorElementId(formId, "privacyConsent")}
                  name="privacyConsent"
                  label={EVENT_PRIVACY_CONSENT.checkboxLabel}
                  errors={fieldErrors.privacyConsent}
                />
              </div>
            </section>

            {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}

            <SubmitButton pending={submitting}>
              {EVENT_PRIVACY_CONSENT.submitLabel}
            </SubmitButton>
          </form>
        )}
      </div>
    </ModalDialog>
  );
}

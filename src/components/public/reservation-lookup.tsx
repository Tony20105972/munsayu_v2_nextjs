"use client";

import { useId, useState, type FormEvent } from "react";
import { StatusMessage, SubmitButton, TextField } from "@/components/ui/form-controls";
import { ModalDialog } from "@/components/ui/modal-dialog";
import {
  reservationCancelSchema,
  reservationLookupSchema,
  type ReservationLookupInput,
  type ReservationSummary,
} from "@/lib/contracts";
import { cancelReservationStub, lookupReservationsStub } from "@/lib/data/stubs";
import { errorElementId, toFieldErrors, type FieldErrors } from "@/lib/form-errors";

const KOREAN_DATE_TIME = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

function formatDateTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return KOREAN_DATE_TIME.format(parsed);
}

const STATUS_LABEL: Record<ReservationSummary["status"], string> = {
  PENDING: "접수",
  CONFIRMED: "확정",
  CANCELLED: "취소됨",
};

const KIND_LABEL: Record<ReservationSummary["kind"], string> = {
  course: "강좌 수강 신청",
  event: "설명회 예약",
};

type LookupState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; items: ReservationSummary[] };

/**
 * PG-011 예약 조회·취소.
 * 입력란 이름과 안내 문구는 docs/evidence/dom/phase1-check.yml 관찰값이다. (EV-0008)
 * 한 연락처로 여러 건을 신청할 수 있어 조회 결과는 목록이고 취소는 건별로 한다. (ASM-001, ASM-013)
 * 조회 결과가 없을 때는 그 사람의 존재 여부를 알리지 않는 문구만 보여 준다.
 */
export function ReservationLookup() {
  const formId = useId();
  const cancelTitleId = `${formId}-cancel-title`;
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupState>({ phase: "idle" });
  const [credentials, setCredentials] = useState<ReservationLookupInput | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReservationSummary | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const parsed = reservationLookupSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setLookup({ phase: "loading" });

    try {
      const result = await lookupReservationsStub(parsed.data);
      setCredentials(parsed.data);
      setLookup({ phase: "done", items: result.items });
    } catch {
      setLookup({ phase: "idle" });
      setFormError("예약 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function handleCancelConfirm() {
    if (!cancelTarget || !credentials) {
      return;
    }

    const parsed = reservationCancelSchema.safeParse({
      name: credentials.name,
      phone: credentials.phone,
      kind: cancelTarget.kind,
      reservationId: cancelTarget.reservationId,
    });

    if (!parsed.success) {
      setFormError("취소 요청을 확인하지 못했습니다. 다시 조회해 주세요.");
      setCancelTarget(null);
      return;
    }

    setCancelling(true);

    try {
      await cancelReservationStub(parsed.data);
      setLookup((current) =>
        current.phase === "done"
          ? {
              phase: "done",
              items: current.items.map((item) =>
                item.reservationId === cancelTarget.reservationId
                  ? { ...item, status: "CANCELLED", cancellable: false }
                  : item,
              ),
            }
          : current,
      );
      setNotice("예약을 취소했습니다.");
    } catch {
      setFormError("예약을 취소하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="text-lg font-bold text-ink">예약 정보 입력 인증</h2>
        <form onSubmit={handleLookup} noValidate className="mt-5 space-y-5">
          <TextField
            controlId={`${formId}-name`}
            errorId={errorElementId(formId, "name")}
            name="name"
            label="학생 이름"
            placeholder="신청 당시 입력한 학생 이름을 입력하세요."
            autoComplete="off"
            required
            errors={fieldErrors.name}
          />
          <TextField
            controlId={`${formId}-phone`}
            errorId={errorElementId(formId, "phone")}
            name="phone"
            label="학부모 휴대폰 번호"
            type="tel"
            inputMode="tel"
            placeholder="숫자만 입력하거나 하이픈(-)을 포함해도 조회 가능합니다."
            autoComplete="off"
            required
            errors={fieldErrors.phone}
          />
          <SubmitButton pending={lookup.phase === "loading"}>
            예약 내역 조회하기
          </SubmitButton>
        </form>

        {formError ? (
          <div className="mt-4">
            <StatusMessage tone="error">{formError}</StatusMessage>
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4">
            <StatusMessage tone="success">{notice}</StatusMessage>
          </div>
        ) : null}
      </section>

      {lookup.phase === "done" ? (
        <section aria-live="polite" className="mt-8">
          <h2 className="text-lg font-bold text-ink">조회 결과</h2>
          {lookup.items.length === 0 ? (
            <p className="mt-4 rounded-xl border border-line bg-surface px-5 py-6 text-sm text-muted">
              입력하신 정보로 확인할 수 있는 예약 내역이 없습니다. 입력한 이름과
              연락처를 다시 확인해 주세요.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {lookup.items.map((item) => (
                <li
                  key={`${item.kind}-${item.reservationId}`}
                  className="rounded-xl border border-line bg-surface px-5 py-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-accent">
                        {KIND_LABEL[item.kind]} · {STATUS_LABEL[item.status]}
                      </p>
                      <h3 className="mt-2 text-base font-bold text-ink">
                        {item.title}
                      </h3>
                      <dl className="mt-2 space-y-1 text-sm text-muted">
                        {item.campusName ? (
                          <div>
                            <dt className="inline font-bold text-ink">지점 : </dt>
                            <dd className="inline">{item.campusName}</dd>
                          </div>
                        ) : null}
                        {item.scheduleText ? (
                          <div>
                            <dt className="inline font-bold text-ink">강의시간 : </dt>
                            <dd className="inline">{item.scheduleText}</dd>
                          </div>
                        ) : null}
                        {formatDateTime(item.scheduledAt) ? (
                          <div>
                            <dt className="inline font-bold text-ink">일시 : </dt>
                            <dd className="inline">
                              {formatDateTime(item.scheduledAt)}
                            </dd>
                          </div>
                        ) : null}
                        {item.attendeeCount ? (
                          <div>
                            <dt className="inline font-bold text-ink">참석 인원 : </dt>
                            <dd className="inline">{item.attendeeCount}명</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="inline font-bold text-ink">신청일 : </dt>
                          <dd className="inline">{formatDateTime(item.appliedAt)}</dd>
                        </div>
                      </dl>
                    </div>

                    {item.cancellable ? (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(item)}
                        className="rounded-md border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-canvas"
                      >
                        예약 취소
                      </button>
                    ) : (
                      <p className="text-sm font-bold text-muted">취소할 수 없는 건</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {cancelTarget ? (
        <ModalDialog open onClose={() => setCancelTarget(null)} titleId={cancelTitleId}>
          <div className="px-6 py-6">
            <h2 id={cancelTitleId} className="text-lg font-bold text-ink">
              예약을 취소하시겠습니까?
            </h2>
            <p className="mt-3 text-sm text-muted">
              {KIND_LABEL[cancelTarget.kind]} · {cancelTarget.title}
            </p>
            <p className="mt-2 text-sm text-muted">
              취소하면 되돌릴 수 없습니다. 다시 참석하시려면 새로 신청해 주세요.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="flex-1 rounded-md border border-line px-5 py-3 text-sm font-bold text-ink hover:bg-canvas"
              >
                돌아가기
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelConfirm}
                className="flex-1 rounded-md bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling ? "처리 중…" : "예약 취소하기"}
              </button>
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </div>
  );
}

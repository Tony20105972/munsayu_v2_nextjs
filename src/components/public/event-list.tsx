"use client";

import { useId, useState } from "react";
import { EventReservationDialog } from "@/components/public/event-reservation-dialog";
import type { EventCardView, EventGroupView } from "@/lib/view-models";

/**
 * PG-010 설명회 목록.
 * 카드 구성(상태 표시·제목·일시·장소·상세보기·접수마감 비활성 버튼)은
 * docs/evidence/dom/phase1-presentation.yml 관찰값이다. (EV-0005, BZ-001)
 * 상태 이름은 관리자가 직접 바꾸며 자동 전환은 없다. (ASM-001)
 */
export function EventList({
  groups,
  retentionPolicy,
}: {
  groups: readonly EventGroupView[];
  /** 관리자 보존 설정의 현재 문구. 예약 모달의 「보유기간」에 그대로 쓴다. (BZ-002) */
  retentionPolicy: string;
}) {
  const [selectedEvent, setSelectedEvent] = useState<EventCardView | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="space-y-12">
        {groups.map((group) => (
          <section key={group.campusName}>
            <h2 className="border-l-4 border-accent bg-surface px-5 py-4 text-base font-bold text-ink">
              {group.campusName}
            </h2>
            {group.events.length === 0 ? (
              <p className="mt-4 rounded-xl border border-line bg-surface px-5 py-6 text-sm text-muted">
                예정된 설명회가 없습니다.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {group.events.map((event) => (
                  <li key={event.id}>
                    <EventCard
                      event={event}
                      onReserve={() => setSelectedEvent(event)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {selectedEvent ? (
        <EventReservationDialog
          event={selectedEvent}
          retentionPolicy={retentionPolicy}
          onClose={() => setSelectedEvent(null)}
        />
      ) : null}
    </div>
  );
}

function EventCard({
  event,
  onReserve,
}: {
  event: EventCardView;
  onReserve: () => void;
}) {
  const detailId = useId();
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <article className="rounded-xl border border-line bg-surface px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="lg:flex-1">
          <p
            className={
              event.isClosed
                ? "inline-block rounded-full bg-line px-3 py-1 text-xs font-bold text-muted"
                : "inline-block rounded-full bg-brand px-3 py-1 text-xs font-bold text-white"
            }
          >
            {event.statusLabel}
          </p>
          <h3 className="mt-3 text-base font-bold text-ink">{event.title}</h3>
          <p className="mt-2 text-sm text-muted">
            {event.startsAtText} · {event.venueName}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            aria-expanded={detailOpen}
            aria-controls={detailId}
            onClick={() => setDetailOpen((open) => !open)}
            className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/50"
          >
            {detailOpen ? "상세닫기" : "상세보기"}
          </button>
          {event.isClosed ? (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md bg-line px-4 py-2 text-sm font-bold text-muted"
            >
              접수마감
            </button>
          ) : (
            <button
              type="button"
              onClick={onReserve}
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              설명회 신청
            </button>
          )}
        </div>
      </div>

      {/* 레거시 `상세보기`의 내용은 관찰하지 못해 카드에 있는 사실만 펼쳐 보여 준다. // ASM-044 */}
      <div
        id={detailId}
        hidden={!detailOpen}
        className="mt-4 rounded-md border border-line bg-canvas px-4 py-3 text-sm text-muted"
      >
        <dl className="space-y-1">
          <div>
            <dt className="inline font-bold text-ink">일시 : </dt>
            <dd className="inline">{event.startsAtText}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-ink">장소 : </dt>
            <dd className="inline">{event.venueName}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-ink">접수 상태 : </dt>
            <dd className="inline">{event.statusLabel}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

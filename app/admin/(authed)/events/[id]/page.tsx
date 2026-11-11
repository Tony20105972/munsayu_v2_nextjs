import Link from "next/link";
import { notFound } from "next/navigation";
import { EventDeleteButton, EventEditForm } from "@/components/admin/events-panels";
import { AdminPageHeading, AdminPanel } from "@/components/admin/ui";
import { formatDateTime, toDateTimeLocalValue } from "@/lib/view-models";
import { getEventReservationTotals } from "@/server/services/applications-admin";
import { listCampuses } from "@/server/services/courses";
import { listEventStatusOptions, listPublicEvents } from "@/server/services/events";

/**
 * AD-003 설명회 수정 / AD-005 설명회별 집계.
 * 예약 건수와 참석 인원 합계를 **따로** 보여 준다. (EV-ADM-03)
 */
export const instant = false;

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const [events, campuses, statusOptions] = await Promise.all([
    listPublicEvents({}),
    listCampuses(),
    listEventStatusOptions(),
  ]);

  const event = events.find((candidate) => candidate.id === id);
  if (!event) {
    notFound();
  }

  const totals = await getEventReservationTotals(event.id);
  const statusOptionId =
    statusOptions.find((option) => option.label === event.statusLabel)?.id ?? "";

  return (
    <>
      <AdminPageHeading
        featureId="AD-003 · AD-005"
        title={event.title}
        description={`관리 코드 ${event.managementCode} · 상태 ${event.statusLabel}`}
      >
        <Link
          href="/admin/events"
          className="rounded-md border border-line bg-canvas px-3 py-2 text-sm font-bold text-ink hover:bg-line/40"
        >
          목록으로
        </Link>
        <EventDeleteButton eventId={event.id} title={event.title} />
      </AdminPageHeading>

      <AdminPanel
        title="예약 집계"
        headingId="event-totals"
        description="취소된 예약은 두 숫자 모두에서 뺍니다. 한 예약에 최대 2명이 들어갈 수 있어 두 숫자가 다릅니다."
      >
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line px-3 py-2">
            <dt className="text-xs text-muted">예약 건수</dt>
            <dd className="mt-1 text-xl font-bold text-ink">
              {totals.reservationCount}건
            </dd>
          </div>
          <div className="rounded-md border border-line px-3 py-2">
            <dt className="text-xs text-muted">참석 인원 합계</dt>
            <dd className="mt-1 text-xl font-bold text-ink">
              {totals.attendeeTotal}명
            </dd>
          </div>
          <div className="rounded-md border border-line px-3 py-2">
            <dt className="text-xs text-muted">개최 일시</dt>
            <dd className="mt-1 text-sm font-bold text-ink">
              {formatDateTime(event.startsAt)}
            </dd>
          </div>
        </dl>

        <p className="mt-3">
          <Link
            href={`/admin/applications?kind=event&eventId=${event.id}`}
            className="text-sm font-bold text-brand hover:underline"
          >
            이 설명회의 예약자 목록 보기 (이름·연락처는 가린 값)
          </Link>
        </p>
      </AdminPanel>

      <AdminPanel title="설명회 수정" headingId="event-edit">
        <EventEditForm
          defaults={{
            eventId: event.id,
            campusId: event.campusId,
            managementCode: event.managementCode,
            title: event.title,
            startsAt: toDateTimeLocalValue(event.startsAt),
            venue: event.venue,
            speaker: event.speaker,
            statusOptionId,
          }}
          campusOptions={campuses.map((campus) => ({
            value: campus.id,
            label: campus.name,
          }))}
          statusOptions={statusOptions.map((option) => ({
            value: option.id,
            label: option.isClosed ? `${option.label} (접수 중단)` : option.label,
          }))}
        />
      </AdminPanel>
    </>
  );
}

import Link from "next/link";
import {
  EventCreateForm,
  EventDeleteButton,
  EventStatusForm,
  EventStatusOptionCreateForm,
} from "@/components/admin/events-panels";
import {
  ADMIN_TABLE_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminEmptyRow,
  AdminPageHeading,
  AdminPanel,
  AdminTableScroll,
} from "@/components/admin/ui";
import { formatDateTime } from "@/lib/view-models";
import { getEventReservationTotals } from "@/server/services/applications-admin";
import { listCampuses } from "@/server/services/courses";
import { listEventStatusOptions, listPublicEvents } from "@/server/services/events";

/**
 * AD-003 설명회 목록·추가 / AD-004 상태 변경 / AD-005 예약 집계.
 *
 * 레거시 목록 칸 구성(EV-ADM-03): 관리 코드, 상태(목록에서 바로 바꾸는 선택 상자),
 * 설명회 제목, 개최일자/시간, 예약현황(n건), 참석인원(n명), 장소, 초청 연사, 등록일, 관리.
 * **예약 건수와 참석 인원 합계는 서로 다른 숫자**이므로 칸을 따로 둔다.
 */
export const instant = false;

type EventsPageProps = {
  searchParams: Promise<{ campusId?: string }>;
};

/** 관리코드 기본값. 자동으로 채우고 관리자가 고칠 수 있다. (ASM-005) */
function nextManagementCode(count: number): string {
  const year = new Date().getFullYear();
  return `${year}-${String(count + 1).padStart(3, "0")}`;
}

export default async function AdminEventsPage({ searchParams }: EventsPageProps) {
  const { campusId } = await searchParams;
  const [campuses, statusOptions, events] = await Promise.all([
    listCampuses(),
    listEventStatusOptions(),
    listPublicEvents(campusId ? { campusId } : {}),
  ]);

  const totals = await Promise.all(
    events.map((event) => getEventReservationTotals(event.id)),
  );
  const totalsById = new Map(totals.map((total) => [total.eventId, total]));

  const campusOptions = campuses.map((campus) => ({
    value: campus.id,
    label: campus.name,
  }));
  const statusSelectOptions = statusOptions.map((option) => ({
    value: option.id,
    label: option.isClosed ? `${option.label} (접수 중단)` : option.label,
  }));

  const createDefaults = {
    campusId: campusId ?? null,
    managementCode: nextManagementCode(events.length),
    title: "",
    startsAt: "",
    venue: null,
    speaker: null,
    statusOptionId: statusOptions[0]?.id ?? "",
  };

  return (
    <>
      <AdminPageHeading
        featureId="AD-003 ~ AD-005"
        title="설명회 관리"
        description="설명회를 추가·수정·삭제하고 상태를 바꿉니다. 상태는 관리자가 직접 바꾸며 인원이 차도 자동으로 바뀌지 않습니다."
      />

      <AdminPanel title="지점 보기" headingId="event-campus-filter">
        <nav aria-label="지점 선택" className="flex flex-wrap gap-2">
          <Link
            href="/admin/events"
            aria-current={campusId ? undefined : "page"}
            className={
              campusId
                ? "rounded-md border border-line bg-canvas px-3 py-1.5 text-sm font-bold text-ink hover:bg-line/40"
                : "rounded-md bg-brand px-3 py-1.5 text-sm font-bold text-white"
            }
          >
            전체
          </Link>
          {campuses.map((campus) => (
            <Link
              key={campus.id}
              href={`/admin/events?campusId=${campus.id}`}
              aria-current={campusId === campus.id ? "page" : undefined}
              className={
                campusId === campus.id
                  ? "rounded-md bg-brand px-3 py-1.5 text-sm font-bold text-white"
                  : "rounded-md border border-line bg-canvas px-3 py-1.5 text-sm font-bold text-ink hover:bg-line/40"
              }
            >
              {campus.name}
            </Link>
          ))}
        </nav>
      </AdminPanel>

      <AdminPanel
        title={`설명회 목록 (${events.length}개)`}
        headingId="event-list"
        description="예약 건수와 참석 인원 합계는 서로 다른 숫자입니다. 한 예약에 최대 2명이 들어갈 수 있습니다."
      >
        <AdminTableScroll>
          <table className={ADMIN_TABLE_CLASS}>
            <caption className="sr-only">설명회 목록</caption>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  관리 코드
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  상태
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  설명회 제목
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  개최 일시
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  예약 건수
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  참석 인원
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  장소
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  초청 연사
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <AdminEmptyRow colSpan={9} label="등록된 설명회가 없습니다." />
              ) : (
                events.map((event) => {
                  const total = totalsById.get(event.id);

                  return (
                    <tr key={event.id}>
                      <th scope="row" className={`${ADMIN_TD_CLASS} font-bold`}>
                        {event.managementCode}
                      </th>
                      <td className={ADMIN_TD_CLASS}>
                        {/*
                          공개 조회 결과에는 상태 옵션 id 가 없고 이름만 있다.
                          상태 이름은 유일하므로 이름으로 되찾아 선택 상자에 쓴다.
                          (조정자 요청: 관리자 설명회 목록이 statusOptionId 를 함께
                          돌려주면 이 되찾기가 필요 없다)
                        */}
                        <EventStatusForm
                          eventId={event.id}
                          statusOptionId={
                            statusOptions.find(
                              (option) => option.label === event.statusLabel,
                            )?.id ?? ""
                          }
                          statusOptions={statusSelectOptions}
                        />
                      </td>
                      <td className={ADMIN_TD_CLASS}>{event.title}</td>
                      <td className={ADMIN_TD_CLASS}>
                        {formatDateTime(event.startsAt)}
                      </td>
                      <td className={ADMIN_TD_CLASS}>
                        <Link
                          href={`/admin/applications?kind=event&eventId=${event.id}`}
                          className="font-bold text-brand hover:underline"
                        >
                          {total?.reservationCount ?? 0}건
                        </Link>
                      </td>
                      <td className={ADMIN_TD_CLASS}>{total?.attendeeTotal ?? 0}명</td>
                      <td className={ADMIN_TD_CLASS}>{event.venue ?? "-"}</td>
                      <td className={ADMIN_TD_CLASS}>{event.speaker ?? "-"}</td>
                      <td className={ADMIN_TD_CLASS}>
                        <div className="flex flex-wrap gap-1">
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="whitespace-nowrap rounded-md border border-line bg-canvas px-2 py-1 text-xs font-bold text-ink hover:bg-line/40"
                          >
                            수정·집계
                          </Link>
                          <EventDeleteButton eventId={event.id} title={event.title} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </AdminPanel>

      <AdminPanel title="설명회 추가" headingId="event-create">
        {statusOptions.length === 0 ? (
          <p className="text-sm text-muted">
            먼저 아래에서 상태를 하나 이상 만들어야 설명회를 추가할 수 있습니다.
          </p>
        ) : (
          <EventCreateForm
            defaults={createDefaults}
            campusOptions={campusOptions}
            statusOptions={statusSelectOptions}
          />
        )}
      </AdminPanel>

      <AdminPanel
        title="설명회 상태 목록"
        headingId="event-status-options"
        description="상태 이름은 데이터로 관리합니다. 필요한 이름을 직접 늘릴 수 있습니다."
      >
        <AdminTableScroll>
          <table className={ADMIN_TABLE_CLASS}>
            <caption className="sr-only">설명회 상태 목록</caption>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  상태 이름
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  정렬 순서
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  새 예약 받기
                </th>
              </tr>
            </thead>
            <tbody>
              {statusOptions.length === 0 ? (
                <AdminEmptyRow colSpan={3} label="등록된 상태가 없습니다." />
              ) : (
                statusOptions.map((option) => (
                  <tr key={option.id}>
                    <th scope="row" className={`${ADMIN_TD_CLASS} font-bold`}>
                      {option.label}
                    </th>
                    <td className={ADMIN_TD_CLASS}>{option.sortOrder}</td>
                    <td className={ADMIN_TD_CLASS}>
                      {option.isClosed ? "받지 않음" : "받음"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>

        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm font-bold text-ink">상태 추가</h3>
          <div className="mt-3">
            <EventStatusOptionCreateForm />
          </div>
        </div>
      </AdminPanel>

      <p className="text-xs text-muted">
        개최 일시는 한국 시간으로 저장하고 한국 시간으로 보여 줍니다. 추가 폼의 관리
        코드는 <code className="font-mono">{createDefaults.managementCode}</code> 처럼
        자동으로 채우고 직접 고칠 수 있습니다. (ASM-005)
      </p>
    </>
  );
}

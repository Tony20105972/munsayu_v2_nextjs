import { EventList, type EventGroup } from "@/components/public/event-list";
import { PageBanner } from "@/components/ui/page-banner";
import { listEventsByCampusStub } from "@/lib/data/stubs";
import { buildPageMetadata } from "@/lib/metadata";
import { CAMPUSES, SITE_TITLE_SUFFIX } from "@/lib/site-config";

/**
 * PG-010 현장설명회 예약 + FM-002 설명회 신청.
 * 근거: docs/evidence/dom/phase1-presentation.yml (EV-0005)
 * 레거시 관찰 시점에는 title 이 홈과 같았다(legacy-seo-map.md).
 */
export const metadata = buildPageMetadata({
  title: SITE_TITLE_SUFFIX,
  description: "문사유 아카데미의 명쾌한 분석과 입시 전략, 현장에서 직접 확인하세요.",
  path: "/sub/Presentation",
});

export default function PresentationPage() {
  const groups: EventGroup[] = CAMPUSES.map((campus) => ({
    campusName: campus.name,
    events: listEventsByCampusStub(campus.id),
  }));

  return (
    <>
      <PageBanner
        title="현장설명회 예약"
        description="문사유 아카데미의 명쾌한 분석과 입시 전략, 현장에서 직접 확인하세요."
      />
      <section className="bg-canvas">
        <div className="mx-auto max-w-5xl px-4 pt-14 text-center">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            설명회 일정 확인 및 예약
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            좌석이 한정되어 있으니 참석을 원하시는 지점의 설명회를 선택해 조기 예약해
            주시기 바랍니다.
          </p>
        </div>
        <EventList groups={groups} />
      </section>
    </>
  );
}

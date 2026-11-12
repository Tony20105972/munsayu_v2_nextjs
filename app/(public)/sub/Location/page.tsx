import { LocationPanel } from "@/components/public/location-panel";
import { PageBanner } from "@/components/ui/page-banner";
import { Tabs } from "@/components/ui/tabs";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";
import { CAMPUSES } from "@/lib/site-config";

/**
 * PG-003 오시는 길.
 * 근거: docs/evidence/dom/phase1-location.yml — 배너 문구, 지점 탭, 대치본원 교통 안내.
 */
export const metadata = buildPageMetadata({
  title: pageTitle("오시는 길"),
  description: "문사유 논술구술학원의 위치를 안내해 드립니다.",
  path: "/sub/Location",
});

export default function LocationPage() {
  return (
    <>
      <PageBanner
        title="오시는 길"
        description="문사유 논술구술학원의 위치를 안내해 드립니다."
      />
      <Tabs
        label="지점 선택"
        items={CAMPUSES.map((campus) => ({
          id: campus.id,
          label: campus.name,
          panel: <LocationPanel campusId={campus.id} />,
        }))}
      />
    </>
  );
}

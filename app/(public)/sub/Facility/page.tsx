import { FacilityPanel } from "@/components/public/facility-panel";
import { PageBanner } from "@/components/ui/page-banner";
import { Tabs } from "@/components/ui/tabs";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";
import { CAMPUSES } from "@/lib/site-config";

/**
 * PG-004 시설안내.
 * 근거: docs/evidence/dom/phase1-facility.yml — 배너 문구, 지점 탭, 대치본원 공간 설명.
 */
export const metadata = buildPageMetadata({
  title: pageTitle("시설안내"),
  description: "최상의 몰입도를 선사하는 문사유의 프리미엄 교육 공간입니다.",
  path: "/sub/Facility",
});

export default function FacilityPage() {
  return (
    <>
      <PageBanner
        title="시설안내"
        description="최상의 몰입도를 선사하는 문사유의 프리미엄 교육 공간입니다."
      />
      <Tabs
        label="지점 선택"
        items={CAMPUSES.map((campus) => ({
          id: campus.id,
          label: campus.name,
          panel: <FacilityPanel campusId={campus.id} />,
        }))}
      />
    </>
  );
}

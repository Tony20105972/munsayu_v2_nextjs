import { connection } from "next/server";
import { Suspense } from "react";
import { RecruitForm } from "@/components/public/recruit-form";
import { LoadingBlock } from "@/components/ui/loading-block";
import { PageBanner } from "@/components/ui/page-banner";
import { loadRetentionPolicies } from "@/lib/data/public-content";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";
import { getSiteSettings } from "@/server/services/settings";

/**
 * AD-011 강사 지원 (`/sub/Recruit`).
 *
 * 레거시와 같은 주소에 같은 항목으로 둔다. (EV-0014)
 * 레거시처럼 **주 메뉴에는 기본으로 보이지 않는다.** 관리자 설정에서 켤 수 있다. // ASM-088
 * 지원서에는 개인정보와 제출 서류가 들어가므로 검색엔진에도 올리지 않는다.
 */
export const metadata = buildPageMetadata({
  title: pageTitle("강사 지원"),
  description: "문사유 아카데미 논술 강사 지원 안내와 지원서 접수.",
  path: "/sub/Recruit",
  noIndex: true,
});

async function RecruitBody() {
  // 보존 문구와 용량 상한은 관리자 설정값이다. 바뀌면 바로 반영돼야 한다. (BZ-002)
  await connection();
  const [retention, settings] = await Promise.all([
    loadRetentionPolicies(),
    getSiteSettings(),
  ]);

  return (
    <RecruitForm
      retentionPolicy={retention.instructor}
      maxBytes={settings.resumeMaxBytes}
    />
  );
}

export default function RecruitPage() {
  return (
    <>
      <PageBanner
        title="문사유 아카데미 강사 지원"
        description="읽기·토론·글쓰기를 하나로 잇는 수업을 함께 만들 선생님을 찾습니다."
      />
      <div className="mx-auto max-w-3xl px-4 py-14">
        <Suspense fallback={<LoadingBlock label="지원서를 불러오는 중입니다." />}>
          <RecruitBody />
        </Suspense>
      </div>
    </>
  );
}

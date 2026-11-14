import Image from "next/image";
import {
  HomeBannerDeleteButton,
  HomeBannerForm,
} from "@/components/admin/media-panels";
import { MediaTabs } from "@/components/admin/media-tabs";
import { AdminPageHeading, AdminPanel } from "@/components/admin/ui";
import { listMediaOptions } from "@/server/services/media";
import { listAdminHomeBanners } from "@/server/services/site-images";

/**
 * AD-015 메인 배너 관리.
 *
 * 홈 상단에서 돌아가는 슬라이드다. 슬라이드마다 배경 사진·제목·설명·버튼·순서·노출
 * 여부를 둔다. 배너를 하나도 두지 않으면 홈은 Phase 3 의 기본 3장으로 보인다.
 */
export const instant = false;

export default async function AdminHomeBannersPage() {
  const [banners, choices] = await Promise.all([
    listAdminHomeBanners(),
    listMediaOptions(),
  ]);

  return (
    <>
      <AdminPageHeading
        featureId="AD-015"
        title="메인 배너"
        description="홈 맨 위에서 번갈아 보이는 배너입니다. 순서가 작은 것부터 보입니다."
      />

      <MediaTabs />

      <AdminPanel
        title={`등록된 배너 (${banners.length}장)`}
        headingId="banner-list"
        description="배너가 없으면 홈은 처음 모양(3장)으로 보입니다."
      >
        {banners.length === 0 ? (
          <p className="text-sm text-muted">
            등록된 배너가 없습니다. 아래에서 배너를 추가하면 홈에 그대로 반영됩니다.
          </p>
        ) : (
          <ul className="space-y-4">
            {banners.map((banner) => (
              <li
                key={banner.id}
                className="rounded-lg border border-line bg-canvas p-4"
              >
                <div className="flex flex-wrap items-start gap-4">
                  {banner.mediaUrl ? (
                    <Image
                      src={banner.mediaUrl}
                      alt={banner.mediaAlt ?? ""}
                      width={160}
                      height={90}
                      className="h-24 w-40 rounded-md object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="h-24 w-40 rounded-md bg-linear-to-br from-banner-start to-banner-end"
                    />
                  )}

                  <div className="min-w-60 flex-1">
                    <p className="text-xs font-bold text-muted">
                      {banner.displayOrder}번 ·{" "}
                      {banner.isVisible ? "홈에 보임" : "숨김"}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm font-bold text-ink">
                      {banner.headline}
                    </p>
                    {banner.body ? (
                      <p className="mt-1 whitespace-pre-line text-xs text-muted">
                        {banner.body}
                      </p>
                    ) : null}
                  </div>

                  <HomeBannerDeleteButton banner={banner} />
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold text-brand">
                    이 배너 수정
                  </summary>
                  <div className="mt-3 rounded-md border border-line bg-surface p-3">
                    <HomeBannerForm banner={banner} choices={choices} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel title="배너 추가" headingId="banner-create">
        <p className="mb-3 text-xs text-muted">
          배경 사진은 「이미지 보관함」에서 먼저 올린 뒤 고릅니다.
        </p>
        <HomeBannerForm choices={choices} />
      </AdminPanel>
    </>
  );
}

import Image from "next/image";
import {
  FacilityPhotoDeleteButton,
  FacilityPhotoForm,
  FacilityPhotoInlineForm,
} from "@/components/admin/media-panels";
import { MediaTabs } from "@/components/admin/media-tabs";
import {
  ADMIN_TABLE_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminEmptyRow,
  AdminPageHeading,
  AdminPanel,
  AdminTableScroll,
} from "@/components/admin/ui";
import { FACILITY_CAMPUS_KEYS, type FacilityCampusKey } from "@/lib/contracts";
import { listMediaOptions } from "@/server/services/media";
import { listAdminFacilityPhotos } from "@/server/services/site-images";

/**
 * AD-015 시설안내 사진 관리.
 *
 * 지점마다 사진을 추가·삭제하고 순서와 설명을 고친다. 등록된 사진이 없으면
 * 공개 화면은 지금 커밋돼 있는 사진으로 보인다.
 *
 * 공간 카드 4칸 사진은 카드 제목과 1:1로 묶여 있어 코드에 그대로 둔다. // ASM-093
 */
export const instant = false;

const CAMPUS_LABELS: Record<FacilityCampusKey, string> = {
  daechi: "대치본원",
  bundang: "분당점",
};

export default async function AdminFacilityPhotosPage() {
  const [photos, choices] = await Promise.all([
    listAdminFacilityPhotos(),
    listMediaOptions(),
  ]);

  return (
    <>
      <AdminPageHeading
        featureId="AD-015"
        title="시설안내 사진"
        description="시설안내 화면의 지점별 사진입니다. 순서가 작은 것부터 보입니다. 설명을 비우면 장식용 사진으로 봅니다."
      />

      <MediaTabs />

      {FACILITY_CAMPUS_KEYS.map((campusKey) => {
        const campusPhotos = photos.filter((photo) => photo.campusKey === campusKey);

        return (
          <AdminPanel
            key={campusKey}
            title={`${CAMPUS_LABELS[campusKey]} (${campusPhotos.length}장)`}
            headingId={`facility-${campusKey}`}
          >
            <AdminTableScroll>
              <table className={ADMIN_TABLE_CLASS}>
                <caption className="sr-only">
                  {CAMPUS_LABELS[campusKey]} 시설안내 사진
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className={ADMIN_TH_CLASS}>
                      미리보기
                    </th>
                    <th scope="col" className={ADMIN_TH_CLASS}>
                      순서 · 설명
                    </th>
                    <th scope="col" className={ADMIN_TH_CLASS}>
                      노출
                    </th>
                    <th scope="col" className={ADMIN_TH_CLASS}>
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campusPhotos.length === 0 ? (
                    <AdminEmptyRow
                      colSpan={4}
                      label="등록된 사진이 없습니다. 공개 화면은 기존 사진으로 보입니다."
                    />
                  ) : (
                    campusPhotos.map((photo) => (
                      <tr key={photo.id}>
                        <td className={ADMIN_TD_CLASS}>
                          <Image
                            src={photo.mediaUrl}
                            alt={photo.mediaAlt}
                            width={120}
                            height={90}
                            className="h-[90px] w-30 rounded-md object-cover"
                          />
                        </td>
                        <td className={ADMIN_TD_CLASS}>
                          <FacilityPhotoInlineForm photo={photo} />
                        </td>
                        <td className={ADMIN_TD_CLASS}>
                          {photo.isVisible ? (
                            "보임"
                          ) : (
                            <span className="text-muted">숨김</span>
                          )}
                        </td>
                        <td className={ADMIN_TD_CLASS}>
                          <div className="flex flex-wrap gap-2">
                            <details>
                              <summary className="cursor-pointer text-xs font-bold text-brand">
                                수정
                              </summary>
                              <div className="mt-3 w-80 rounded-md border border-line bg-canvas p-3">
                                <FacilityPhotoForm photo={photo} choices={choices} />
                              </div>
                            </details>
                            <FacilityPhotoDeleteButton photo={photo} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </AdminTableScroll>
          </AdminPanel>
        );
      })}

      <AdminPanel title="사진 추가" headingId="facility-create">
        <p className="mb-3 text-xs text-muted">
          사진은 「이미지 보관함」에서 먼저 올린 뒤 고릅니다.
        </p>
        <FacilityPhotoForm choices={choices} />
      </AdminPanel>
    </>
  );
}

import { SiteSettingsForm } from "@/components/admin/settings-panels";
import { AdminPageHeading, AdminPanel } from "@/components/admin/ui";
import { getSiteSettings } from "@/server/services/settings";

/**
 * 사이트 설정 — 진단 신청 버튼이 열 구글 폼 주소, 강사 지원 메뉴 노출, 제출 서류 용량 상한.
 * 값은 `AppSetting` 표에 키·값으로 저장한다.
 */
export const instant = false;

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <AdminPageHeading
        featureId="AD-009 / AD-011"
        title="사이트 설정"
        description="공개 화면의 신청 버튼 연결 주소와 강사 지원 메뉴 노출을 관리합니다."
      />

      <AdminPanel title="설정" headingId="site-settings">
        <SiteSettingsForm settings={settings} />
      </AdminPanel>
    </>
  );
}

import Link from "next/link";
import { PurgeRunPanel, RetentionSettingForm } from "@/components/admin/privacy-panels";
import { AdminPageHeading, AdminPanel, AuditNotice } from "@/components/admin/ui";
import { AUDIT_ACTIONS } from "@/lib/contracts";
import { getRetentionSetting } from "@/server/services/privacy";

/**
 * AD-013 개인정보 관리.
 *
 * 보존 설정 문구는 신청 폼의 「보유기간」 안내와 **같은 값**을 쓴다. (BZ-002, ASM-009)
 * 원문 보기·CSV 내려받기·파기 대상 시각 설정은 기록이 있는 「신청 목록」 화면에서 한다.
 * 이 화면은 설정과 파기 실행을 담당한다.
 */
export const instant = false;

export default async function AdminPrivacyPage() {
  const setting = await getRetentionSetting();

  return (
    <>
      <AdminPageHeading
        featureId="AD-013"
        title="개인정보 관리"
        description="보유기간 안내 문구를 정하고, 보존 기간이 끝난 기록의 개인정보를 지웁니다."
      />

      <AdminPanel title="무엇이 기록에 남나요?" headingId="privacy-audit">
        <AuditNotice>
          아래 동작은 모두 **누가 언제 했는지** 서버에 기록됩니다. 기록에는 건수와 쓰인
          필터 이름만 남고 이름·연락처·검색어는 남지 않습니다.
        </AuditNotice>
        <ul className="mt-3 grid gap-1 text-sm text-ink sm:grid-cols-2">
          <li>· 개인정보 원문 보기 (PII_VIEW)</li>
          <li>· CSV 내려받기 (CSV_EXPORT)</li>
          <li>· 파기 대상 시각 설정 (PURGE_SCHEDULE_SET)</li>
          <li>· 파기 실행 (PII_PURGE)</li>
          <li>· 보존 설정 변경 (RETENTION_SETTING_CHANGE)</li>
          <li>· 회원 상태 변경, 관리자 계정 추가·삭제</li>
        </ul>
        <p className="mt-2 text-xs text-muted">
          기록 종류는 공유 계약의 `AUDIT_ACTIONS` {AUDIT_ACTIONS.length}가지입니다.
        </p>
      </AdminPanel>

      <AdminPanel
        title="보존 설정"
        headingId="privacy-retention"
        description="여기서 바꾼 문구가 공개 신청 폼의 「보유기간」 안내에 그대로 나오고, 파기 기준도 같은 값을 씁니다."
      >
        <RetentionSettingForm
          courseRetentionPolicy={setting.courseRetentionPolicy}
          eventRetentionPolicy={setting.eventRetentionPolicy}
          automaticPurgeEnabled={setting.automaticPurgeEnabled}
        />
      </AdminPanel>

      <AdminPanel
        title="파기 대상 시각 설정"
        headingId="privacy-schedule"
        description="건별 설정은 신청 목록 화면에서 합니다. 강좌 종강·설명회 종료 안내가 끝난 건에 기준 시각을 넣어 주세요."
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/applications?kind=course"
            className="rounded-md border border-line bg-canvas px-3 py-2 text-sm font-bold text-ink hover:bg-line/40"
          >
            강좌 신청 목록에서 설정
          </Link>
          <Link
            href="/admin/applications?kind=event"
            className="rounded-md border border-line bg-canvas px-3 py-2 text-sm font-bold text-ink hover:bg-line/40"
          >
            설명회 예약 목록에서 설정
          </Link>
        </div>
      </AdminPanel>

      <AdminPanel
        title="파기 실행"
        headingId="privacy-purge"
        description="파기 대상 시각이 지난 기록의 이름·연락처·학교를 「파기됨」으로 바꿉니다. 신청 기록 자체는 남습니다."
      >
        <PurgeRunPanel />
      </AdminPanel>

      <AdminPanel title="아직 안 되는 것" headingId="privacy-limits">
        <ul className="space-y-1 text-sm text-muted">
          <li>
            · 자동 파기는 설정값만 저장합니다. 주기 실행(cron)은 배포 환경이 정해진 뒤에
            붙습니다. 기본값은 꺼짐입니다.
          </li>
          <li>· 감사기록 조회 화면은 이번 범위에 없습니다. 기록은 서버에 쌓입니다.</li>
        </ul>
      </AdminPanel>
    </>
  );
}

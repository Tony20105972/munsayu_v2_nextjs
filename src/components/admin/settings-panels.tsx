"use client";

import { AdminActionForm } from "@/components/admin/forms";
import { AdminCheckboxField, AdminTextField } from "@/components/admin/fields";
import { updateSiteSettingsAction } from "@/lib/actions/admin-intake";
import { RESUME_FORMAT_LABEL, type SiteSettingsInput } from "@/lib/contracts";

/**
 * 사이트 설정.
 *
 * - 「문해력 진단 신청」 버튼이 열 구글 폼 주소 // ASM-082
 * - `/sub/Recruit` 강사 지원 메뉴 노출 (레거시처럼 기본은 숨김) // ASM-088
 * - 강사 지원 제출 서류 용량 상한 // ASM-085
 */
export function SiteSettingsForm({ settings }: { settings: SiteSettingsInput }) {
  return (
    <AdminActionForm
      action={updateSiteSettingsAction}
      submitLabel="설정 저장"
      className="space-y-4"
    >
      {({ fieldErrors }) => (
        <>
          <AdminTextField
            name="diagnosisCtaExternalUrl"
            label="문해력 진단 신청 구글 폼 주소"
            hint="공개 화면의 「문해력 진단 신청」 버튼이 이 주소를 엽니다. 사이트 안에는 신청 폼을 두지 않습니다."
            type="url"
            required
            defaultValue={settings.diagnosisCtaExternalUrl}
            errors={fieldErrors.diagnosisCtaExternalUrl}
          />

          <AdminCheckboxField
            name="recruitMenuVisible"
            label="강사 지원(/sub/Recruit) 메뉴에 보이기"
            hint="레거시처럼 기본은 숨김입니다. 꺼 두어도 주소를 아는 사람은 들어갈 수 있습니다."
            defaultChecked={settings.recruitMenuVisible}
            errors={fieldErrors.recruitMenuVisible}
          />

          <AdminTextField
            name="resumeMaxBytes"
            label="강사 지원 제출 서류 용량 상한 (바이트)"
            hint={`${RESUME_FORMAT_LABEL} 형식만 받습니다. 기본값은 10MB(10485760)입니다.`}
            type="number"
            min={1024 * 1024}
            max={50 * 1024 * 1024}
            required
            defaultValue={String(settings.resumeMaxBytes)}
            errors={fieldErrors.resumeMaxBytes}
          />
        </>
      )}
    </AdminActionForm>
  );
}

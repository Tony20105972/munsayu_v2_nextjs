import "server-only";
import {
  MEDIA_UPLOAD_MAX_BYTES_DEFAULT,
  RESUME_MAX_BYTES_DEFAULT,
  SITE_SETTING_KEYS,
  type SiteSettingsInput,
} from "@/lib/contracts";
import { db } from "@/server/db";
import { writeAuditLog } from "@/server/services/audit";

/**
 * 관리자가 바꾸는 사이트 설정. `AppSetting` 한 테이블에 키·값으로 저장한다.
 * 기본값은 코드에 두고, 저장된 값이 없으면 기본값을 쓴다.
 *
 * - 진단 신청 버튼이 열 구글 폼 주소 // ASM-082
 * - `/sub/Recruit` 메뉴 노출 // ASM-088
 * - 제출 서류 용량 상한 // ASM-085
 * - 사진 용량 상한 (AD-015)
 *
 * `getSiteSettings()` 는 DB 를 읽지 못해도 던지지 않는다. 설정 하나 때문에
 * 공개 화면 전체가 멈추지 않게 하려는 것이다. (AD-015 복원력)
 */

/** 레거시가 쓰던 구글 폼 주소. 관리자가 바꾸기 전까지 이 값을 쓴다. (EV-0013, RT-003) */
export const LEGACY_DIAGNOSIS_FORM_URL = "https://forms.gle/XUjFY9jVStQDKskg8";

export const SITE_SETTINGS_DEFAULTS: SiteSettingsInput = {
  diagnosisCtaExternalUrl: LEGACY_DIAGNOSIS_FORM_URL,
  // 레거시처럼 메뉴에서는 기본으로 숨긴다. 주소로는 들어갈 수 있다.
  recruitMenuVisible: false,
  resumeMaxBytes: RESUME_MAX_BYTES_DEFAULT,
  mediaMaxUploadBytes: MEDIA_UPLOAD_MAX_BYTES_DEFAULT,
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseBytes(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getSiteSettings(): Promise<SiteSettingsInput> {
  let byKey = new Map<string, string>();

  try {
    const rows = await db.appSetting.findMany({
      where: { key: { in: Object.values(SITE_SETTING_KEYS) } },
    });
    byKey = new Map(rows.map((row) => [row.key, row.value]));
  } catch (error) {
    // 설정을 못 읽으면 기본값으로 간다. 화면이 멈추는 것보다 낫다. (AD-015 복원력)
    console.error("site_settings_load_failed", {
      name: error instanceof Error ? error.name : "Unknown",
    });
    return SITE_SETTINGS_DEFAULTS;
  }

  return {
    diagnosisCtaExternalUrl:
      byKey.get(SITE_SETTING_KEYS.diagnosisCtaExternalUrl) ??
      SITE_SETTINGS_DEFAULTS.diagnosisCtaExternalUrl,
    recruitMenuVisible: parseBoolean(
      byKey.get(SITE_SETTING_KEYS.recruitMenuVisible),
      SITE_SETTINGS_DEFAULTS.recruitMenuVisible,
    ),
    resumeMaxBytes: parseBytes(
      byKey.get(SITE_SETTING_KEYS.resumeMaxBytes),
      SITE_SETTINGS_DEFAULTS.resumeMaxBytes,
    ),
    mediaMaxUploadBytes: parseBytes(
      byKey.get(SITE_SETTING_KEYS.mediaMaxUploadBytes),
      SITE_SETTINGS_DEFAULTS.mediaMaxUploadBytes,
    ),
  };
}

export async function updateSiteSettings(
  actorUserId: string,
  input: SiteSettingsInput,
): Promise<SiteSettingsInput> {
  const entries: Array<[string, string]> = [
    [SITE_SETTING_KEYS.diagnosisCtaExternalUrl, input.diagnosisCtaExternalUrl],
    [SITE_SETTING_KEYS.recruitMenuVisible, String(input.recruitMenuVisible)],
    [SITE_SETTING_KEYS.resumeMaxBytes, String(input.resumeMaxBytes)],
    [SITE_SETTING_KEYS.mediaMaxUploadBytes, String(input.mediaMaxUploadBytes)],
  ];

  await db.$transaction(
    entries.map(([key, value]) =>
      db.appSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );

  // 설정 변경도 누가 바꿨는지 남긴다. 값에는 개인정보가 없다.
  await writeAuditLog({
    actorUserId,
    action: "RETENTION_SETTING_CHANGE",
    resourceType: "AppSetting",
    filterSummary: `recruitMenuVisible=${input.recruitMenuVisible}`,
  });

  return input;
}

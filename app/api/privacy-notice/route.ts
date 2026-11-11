import { COURSE_PRIVACY_CONSENT } from "@/lib/contracts";
import { getRetentionSetting } from "@/server/services/privacy";
import { errorResponse, jsonNoStore } from "@/server/http";

/**
 * BZ-002 동의 문구 표시용. 보유기간 문구는 관리자 보존 설정과 **같은 값**을 쓴다. (ASM-009)
 * 설정을 바꾸면 화면 문구도 함께 바뀐다.
 */
export async function GET(): Promise<Response> {
  try {
    const setting = await getRetentionSetting();
    return jsonNoStore(
      {
        heading: COURSE_PRIVACY_CONSENT.heading,
        purpose: COURSE_PRIVACY_CONSENT.purpose,
        collectedItems: COURSE_PRIVACY_CONSENT.collectedItems,
        checkboxLabel: COURSE_PRIVACY_CONSENT.checkboxLabel,
        submitLabel: COURSE_PRIVACY_CONSENT.submitLabel,
        courseRetention: setting.courseRetentionPolicy,
        eventRetention: setting.eventRetentionPolicy,
      },
      200,
    );
  } catch (error) {
    return errorResponse(error);
  }
}

import { privacyRetentionSettingSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { getRetentionSetting, updateRetentionSetting } from "@/server/services/privacy";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-013 보존 설정 조회. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const setting = await getRetentionSetting();
    return jsonNoStore(
      {
        courseRetentionPolicy: setting.courseRetentionPolicy,
        eventRetentionPolicy: setting.eventRetentionPolicy,
        automaticPurgeEnabled: setting.automaticPurgeEnabled,
      },
      200,
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/** AD-013 보존 설정 변경. 동의 문구 표시와 같은 값을 쓴다. (ASM-009) */
export async function PUT(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const input = await parseJsonBody(request, privacyRetentionSettingSchema);
    const setting = await updateRetentionSetting(admin.id, input);
    return jsonNoStore(
      {
        courseRetentionPolicy: setting.courseRetentionPolicy,
        eventRetentionPolicy: setting.eventRetentionPolicy,
        automaticPurgeEnabled: setting.automaticPurgeEnabled,
      },
      200,
    );
  } catch (error) {
    return errorResponse(error);
  }
}

import { purgeEligibilitySchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { setPurgeEligibility } from "@/server/services/privacy";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-013 파기 대상 시각 설정. (ASM-009) */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const input = await parseJsonBody(request, purgeEligibilitySchema);
    return jsonNoStore(await setPurgeEligibility(admin.id, input), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

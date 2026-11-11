import { applicationRevealSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { revealApplication } from "@/server/services/applications-admin";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-013 개인정보 원문 조회. 조회할 때마다 감사기록을 남긴다. */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const input = await parseJsonBody(request, applicationRevealSchema);
    return jsonNoStore(await revealApplication(admin.id, input), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

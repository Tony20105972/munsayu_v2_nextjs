import { smsSubscriptionFilterSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { listSmsSubscriptions } from "@/server/services/sms-subscriptions";
import { errorResponse, jsonNoStore, parseSearchParams } from "@/server/http";

/** AD-010 문자신청내역 목록 (마스킹). */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const filter = parseSearchParams(request, smsSubscriptionFilterSchema);
    return jsonNoStore(await listSmsSubscriptions(filter), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

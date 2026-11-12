import { smsSubscriptionSchema } from "@/lib/contracts";
import { createSmsSubscription } from "@/server/services/sms-subscriptions";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

/** AD-010 설명회 알림 신청. 문자 발송은 하지 않고 신청 내역만 남긴다. */
export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "sms-subscriptions");
    const input = await parseJsonBody(request, smsSubscriptionSchema);
    return jsonNoStore(await createSmsSubscription(input), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

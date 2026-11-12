import { smsSubscriptionExportSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { exportSmsSubscriptionsCsv } from "@/server/services/sms-subscriptions";
import { csvResponse, errorResponse, parseSearchParams } from "@/server/http";

/** AD-013 설명회 알림 신청 CSV. */
export async function GET(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const filter = parseSearchParams(request, smsSubscriptionExportSchema);
    const result = await exportSmsSubscriptionsCsv(admin.id, filter);
    return csvResponse(result.csv, "sms-subscriptions.csv");
  } catch (error) {
    return errorResponse(error);
  }
}

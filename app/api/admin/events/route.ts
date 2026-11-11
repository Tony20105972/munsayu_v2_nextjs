import { eventUpsertSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { createEvent, listPublicEvents } from "@/server/services/events";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-003 설명회 목록. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const campusId = new URL(request.url).searchParams.get("campusId") ?? undefined;
    return jsonNoStore({ items: await listPublicEvents({ campusId }) }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

/** AD-003 설명회 추가. */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseJsonBody(request, eventUpsertSchema);
    const event = await createEvent(input);
    return jsonNoStore({ id: event.id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

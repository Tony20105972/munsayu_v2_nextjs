import { eventStatusOptionSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import {
  createEventStatusOption,
  listEventStatusOptions,
} from "@/server/services/events";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-004 설명회 상태 목록. 데이터로 관리한다. (ASM-001) */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const options = await listEventStatusOptions();
    return jsonNoStore(
      {
        items: options.map((option) => ({
          id: option.id,
          label: option.label,
          sortOrder: option.sortOrder,
          isClosed: option.isClosed,
        })),
      },
      200,
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseJsonBody(request, eventStatusOptionSchema);
    const option = await createEventStatusOption(input);
    return jsonNoStore({ id: option.id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

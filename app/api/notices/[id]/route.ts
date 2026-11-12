import { getNotice } from "@/server/services/notices";
import { errorResponse, jsonNoStore } from "@/server/http";

/** PG-012 공지 상세. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await context.params;
    return jsonNoStore(await getNotice(id), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

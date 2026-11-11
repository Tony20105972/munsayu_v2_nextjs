import { paginationSchema } from "@/lib/contracts";
import { listNotices } from "@/server/services/notices";
import { errorResponse, jsonNoStore, parseSearchParams } from "@/server/http";

/** PG-012 공지 목록. 공개 읽기 전용이다. (ASM-015) */
export async function GET(request: Request): Promise<Response> {
  try {
    const { page, pageSize } = parseSearchParams(request, paginationSchema);
    return jsonNoStore(await listNotices({ page, pageSize }), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

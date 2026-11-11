import { listNotices } from "@/server/services/notices";
import { errorResponse, jsonNoStore } from "@/server/http";

/** PG-012 공지 목록. 공개 읽기 전용이다. (ASM-015) */
export async function GET(): Promise<Response> {
  try {
    return jsonNoStore({ items: await listNotices() }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

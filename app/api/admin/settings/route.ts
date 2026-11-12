import { requireAdmin } from "@/server/auth";
import { getSiteSettings } from "@/server/services/settings";
import { errorResponse, jsonNoStore } from "@/server/http";

/** 진단 버튼 연결 대상·강사 모집 메뉴 노출·제출 서류 용량 상한. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    return jsonNoStore(await getSiteSettings(), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

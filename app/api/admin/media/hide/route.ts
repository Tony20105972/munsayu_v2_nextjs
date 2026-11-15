import { mediaHideSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { setMediaHidden } from "@/server/services/media";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/**
 * AD-015 보관함 사진 숨기기·다시 보이기.
 *
 * 기존 사이트 사진(`public/` 에 커밋된 파일)은 실행 중에 지울 수 없어 이 경로로
 * 목록·고르기 상자에서 뺀다. 쓰는 중인 사진은 숨기지 않는다 — 공개 화면은 그 사진을
 * 계속 쓰는데 보관함에서 사라지면 되돌릴 자리를 찾을 수 없다.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const input = await parseJsonBody(request, mediaHideSchema);
    const result = await setMediaHidden(admin.id, input);
    return jsonNoStore(result, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

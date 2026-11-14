import { mediaBulkDeleteSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { deleteMediaAssets } from "@/server/services/media";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/**
 * AD-015 보관함 사진 삭제. 한 장이든 여러 장이든 같은 경로를 쓴다.
 *
 * 쓰는 중인 사진과 기존 사이트 사진은 지우지 않고 `blocked` 에 이유와 쓰는 곳을 담아
 * 돌려준다. 한 장이 막혀도 나머지는 지우므로 성공·실패가 섞인 200 응답이 정상이다.
 */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const input = await parseJsonBody(request, mediaBulkDeleteSchema);
    const result = await deleteMediaAssets(admin.id, input);
    return jsonNoStore(result, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

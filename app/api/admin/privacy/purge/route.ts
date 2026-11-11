import { purgeRunSchema } from "@/lib/contracts";
import { requireAdmin, secretEquals } from "@/server/auth";
import { unauthenticated } from "@/server/errors";
import { runPurge } from "@/server/services/privacy";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/**
 * AD-013 파기 실행.
 * 관리자 세션 또는 `x-purge-secret` 헤더(예약 실행 경로)로만 호출할 수 있다.
 * 비밀값 비교는 상수 시간으로 한다.
 */
async function resolveActor(request: Request): Promise<string | null> {
  const provided = request.headers.get("x-purge-secret");
  const expected = process.env.PRIVACY_PURGE_SECRET;
  if (provided && expected && secretEquals(provided, expected)) {
    return null;
  }
  if (provided && !expected) {
    throw unauthenticated();
  }
  const admin = await requireAdmin(request);
  return admin.id;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actorUserId = await resolveActor(request);
    const input = await parseJsonBody(request, purgeRunSchema);
    const result = await runPurge({ actorUserId, dryRun: input.dryRun });
    return jsonNoStore(result, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

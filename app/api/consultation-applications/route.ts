import { consultationApplicationSchema } from "@/lib/contracts";
import { createConsultationApplication } from "@/server/services/consultations";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

/**
 * AD-009 입학진단·상담 신청 입력 경로.
 *
 * 사이트 안에는 신청 폼을 두지 않는다. 공개 화면의 「문해력 진단 신청」 버튼은
 * 관리자가 등록한 구글 폼 주소로 보낸다. (사용자 결정 2026-11-12) // ASM-082
 * 이 경로는 외부 신청(구글 폼 연동 등)을 관리자 목록으로 가져올 때 쓰는 입력 지점이다.
 * 같은 key 재전송은 기존 건을 201 + replayed=true로 돌려준다.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "consultation-applications");
    const input = await parseJsonBody(request, consultationApplicationSchema);
    return jsonNoStore(await createConsultationApplication(input), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

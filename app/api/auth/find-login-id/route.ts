import { findLoginIdSchema } from "@/lib/contracts";
import { sendLoginIdByMail } from "@/server/services/accounts";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

/** FM-003 아이디 찾기. 계정 존재 여부와 무관하게 같은 202를 준다. */
export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "auth-find-login-id");
    const input = await parseJsonBody(request, findLoginIdSchema);
    await sendLoginIdByMail(input);
    return jsonNoStore({ message: "입력하신 정보로 안내 메일을 보냈습니다." }, 202);
  } catch (error) {
    return errorResponse(error);
  }
}

import { updateProfileSchema } from "@/lib/contracts";
import { requireMember } from "@/server/auth";
import { updateProfile } from "@/server/services/accounts";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** FM-003 회원 정보 수정. */
export async function PATCH(request: Request): Promise<Response> {
  try {
    const user = await requireMember(request);
    const input = await parseJsonBody(request, updateProfileSchema);
    const updated = await updateProfile(user.id, input);
    return jsonNoStore({ id: updated.id, name: updated.name }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

import { instructorUpsertSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { createInstructor, listInstructors } from "@/server/services/instructors";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** AD-006 강사 목록. 한 강사가 여러 팀에 속할 수 있다. (ASM-003) */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    return jsonNoStore({ items: await listInstructors() }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const input = await parseJsonBody(request, instructorUpsertSchema);
    const instructor = await createInstructor(admin.id, input);
    return jsonNoStore({ id: instructor.id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

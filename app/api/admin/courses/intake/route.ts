import { courseIntakeChangeSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { setCourseIntake } from "@/server/services/courses";
import { errorResponse, jsonNoStore, parseJsonBody } from "@/server/http";

/** BZ-001 강좌 접수 상태 수동 변경. 자동 전환은 없다. (Q-ADM-05) */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const input = await parseJsonBody(request, courseIntakeChangeSchema);
    const course = await setCourseIntake(input);
    return jsonNoStore({ id: course.id, intakeOpen: course.intakeStatus === "OPEN" }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

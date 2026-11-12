import { instructorApplicationDownloadSchema } from "@/lib/contracts";
import { requireAdmin } from "@/server/auth";
import { downloadInstructorDocument } from "@/server/services/instructor-applications";
import { errorResponse, parseSearchParams } from "@/server/http";

/**
 * AD-011 제출 서류 내려받기.
 * 저장소에 공개 주소가 없으므로 이 인증 경로가 유일한 출구다. 내려받기는 기록에 남는다. (AD-013)
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const input = parseSearchParams(request, instructorApplicationDownloadSchema);
    const document = await downloadInstructorDocument(admin.id, input);

    return new Response(new Uint8Array(document.bytes), {
      status: 200,
      headers: {
        "Content-Type": document.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

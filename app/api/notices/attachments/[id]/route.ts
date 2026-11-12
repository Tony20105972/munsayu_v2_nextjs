import { getStorageAdapter } from "@/server/adapters/storage";
import { getPublicNoticeAttachment } from "@/server/services/notices";
import { errorResponse } from "@/server/http";
import { notFound } from "@/server/errors";

/** AD-014 게시된 공지의 첨부파일 내려받기. 임시 저장 글의 첨부는 찾지 못한다. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await context.params;
    const attachment = await getPublicNoticeAttachment(id);

    const bytes = await getStorageAdapter()
      .get("public", attachment.storageKey)
      .catch(() => null);
    if (!bytes) throw notFound();

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

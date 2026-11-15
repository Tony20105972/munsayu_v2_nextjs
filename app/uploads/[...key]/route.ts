import { getStorageAdapter } from "@/server/adapters/storage";
import { errorResponse } from "@/server/http";
import { notFound } from "@/server/errors";

/**
 * AD-015 공개 영역에 저장된 이미지를 내보낸다.
 *
 * 로컬 StorageAdapter 는 저장소 바깥 디렉터리(`.storage/public/`)에 파일을 두므로
 * `public/` 처럼 정적으로 제공되지 않는다. 그래서 이 경로가 필요하다.
 * 운영에서 Vercel Blob 어댑터로 바꾸면 `urlFor()` 가 Blob 주소를 돌려주고
 * 이 경로는 쓰이지 않는다. (ADR-008, Phase 7)
 *
 * 내보내는 것은 이미지뿐이다. 확장자 목록에 없는 키는 404 로 막는다.
 * 키는 UUID 라 내용이 바뀌지 않으므로 오래 캐시해도 된다.
 */
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  try {
    const { key } = await context.params;
    if (!Array.isArray(key) || key.length === 0) throw notFound();
    const joined = key.join("/");

    const extension = (joined.split(".").pop() ?? "").toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) throw notFound();

    const bytes = await getStorageAdapter()
      .get("public", joined)
      .catch(() => null);
    if (!bytes) throw notFound();

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // 이미지로만 해석하게 한다. 브라우저가 내용을 보고 추측하지 않도록 막는다.
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

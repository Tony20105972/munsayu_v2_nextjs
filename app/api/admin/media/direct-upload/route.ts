import { requireAdmin } from "@/server/auth";
import { getStorageAdapter, verifyUploadTicket } from "@/server/adapters/storage";
import { forbidden, validationFailed } from "@/server/errors";
import { emptyNoStore, errorResponse } from "@/server/http";
import { MEDIA_MESSAGES } from "@/lib/contracts";

/**
 * AD-015 로컬 저장소용 직접 업로드 자리.
 *
 * 브라우저가 서버 함수를 거치지 않고 저장소에 바이트를 보내는 흐름을 로컬에서도
 * 똑같이 쓰기 위한 경로다. 운영에서 Vercel Blob 어댑터를 끼우면 브라우저가 Blob 으로
 * 바로 올리고 이 경로는 쓰이지 않는다. (ADR-008)
 *
 * 들어온 바이트는 **검사 전 원본**이다. 그래서
 * - 공개 주소가 없는 `staging` 영역에만 쓴다.
 * - 형식·크기 검사와 변환은 마무리 단계(`finalizeMediaUpload`)에서 한다.
 *
 * 통과 조건은 두 가지를 **모두** 만족해야 한다.
 * 1. 관리자 세션 (요청마다 서버에서 다시 확인한다)
 * 2. 서버가 서명한 티켓 (영역·키·상한·만료)
 * 티켓만 있고 세션이 없으면 통과하지 못한다.
 */
export const maxDuration = 60;

/** 본문을 다 읽지 않고도 상한을 넘는 즉시 끊는다. 메모리를 지키기 위한 것이다. */
async function readLimited(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        throw validationFailed({ image: [MEDIA_MESSAGES.tooLarge(maxBytes)] });
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function PUT(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const ticket = verifyUploadTicket({
      scope: url.searchParams.get("scope") ?? "",
      key: url.searchParams.get("key") ?? "",
      maxBytes: url.searchParams.get("maxBytes") ?? "",
      expiresAt: url.searchParams.get("expiresAt") ?? "",
      signature: url.searchParams.get("signature") ?? "",
    });
    if (!ticket) {
      // 서명이 틀렸거나 만료됐다. 왜 틀렸는지는 알려 주지 않는다.
      throw forbidden();
    }

    // `Content-Length` 가 있으면 본문을 받기 전에 먼저 거른다.
    const declared = Number.parseInt(request.headers.get("content-length") ?? "", 10);
    if (Number.isSafeInteger(declared) && declared > ticket.maxBytes) {
      throw validationFailed({ image: [MEDIA_MESSAGES.tooLarge(ticket.maxBytes)] });
    }

    if (!request.body) {
      throw validationFailed({ image: ["올릴 사진을 선택해 주세요."] });
    }

    const bytes = await readLimited(request.body, ticket.maxBytes);
    if (bytes.byteLength === 0) {
      throw validationFailed({ image: ["올릴 사진을 선택해 주세요."] });
    }

    await getStorageAdapter().put(
      ticket.scope,
      ticket.key,
      bytes,
      "application/octet-stream",
    );

    return emptyNoStore(204);
  } catch (error) {
    return errorResponse(error);
  }
}

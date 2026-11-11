import { ZodError, type ZodType } from "zod";
import type { ApiError } from "@/lib/contracts";
import { AppError, validationFailed } from "@/server/errors";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** 개인정보가 담길 수 있는 모든 응답은 캐시하지 않는다. (BLUEPRINT 10장) */
export function jsonNoStore(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { ...NO_STORE } });
}

export function emptyNoStore(status: number): Response {
  return new Response(null, { status, headers: { ...NO_STORE } });
}

/** Zod 오류를 필드 이름과 사유만 담은 형태로 바꾼다. 제출한 값은 절대 넣지 않는다. */
export function toFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    const bucket = fieldErrors[key] ?? [];
    bucket.push(issue.message);
    fieldErrors[key] = bucket;
  }
  return fieldErrors;
}

/**
 * 오류 → HTTP 변환의 단일 지점. 내부 예외 내용은 응답에 내보내지 않는다.
 * 로그에도 오류 이름과 코드만 남긴다. (BLUEPRINT 10장)
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    const body: ApiError = { code: error.code, message: error.message };
    if (error.fieldErrors) {
      body.fieldErrors = error.fieldErrors;
    }
    return jsonNoStore(body, error.status);
  }

  if (error instanceof ZodError) {
    return errorResponse(validationFailed(toFieldErrors(error)));
  }

  console.error("unhandled_request_error", {
    name: error instanceof Error ? error.name : "Unknown",
  });

  return jsonNoStore(
    { code: "INTERNAL_ERROR", message: "요청을 처리할 수 없습니다." },
    500,
  );
}

/** JSON 본문을 공유 계약 스키마로 검증한다. 형식이 깨졌어도 422로만 답한다. */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw validationFailed({ _root: ["요청 본문이 올바른 JSON이 아닙니다."] });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw validationFailed(toFieldErrors(parsed.error));
  }
  return parsed.data;
}

/** 쿼리 문자열을 공유 계약 스키마로 검증한다. 비어 있는 값은 미지정으로 본다. */
export function parseSearchParams<T>(request: Request, schema: ZodType<T>): T {
  const url = new URL(request.url);
  const raw: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (value !== "") {
      raw[key] = value;
    }
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw validationFailed(toFieldErrors(parsed.error));
  }
  return parsed.data;
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

import "server-only";
import { cookies, headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import type { SessionScope } from "@prisma/client";
import { ZodError, type ZodType } from "zod";
import type { ActionFailure, ActionSuccess } from "@/lib/action-result";
import { toFieldErrors, type FieldErrors } from "@/lib/form-errors";
import { SESSION_COOKIE_NAMES } from "@/server/auth/cookies";
import { destroySession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";

/**
 * Server Action 공통 도구.
 *
 * `"use server"` 파일은 async 함수만 export 할 수 있으므로 동기 도우미는 이 파일에 둔다.
 * 여기서 만드는 문구는 모두 `AppError.message`(사용자용 한국어 문구)이거나
 * 공유 계약이 설정한 한국어 Zod 문구다. 내부 예외 내용은 절대 내보내지 않는다.
 */

const UNEXPECTED_MESSAGE = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export function success(): ActionSuccess<undefined>;
export function success<TData>(data: TData): ActionSuccess<TData>;
export function success<TData>(data?: TData): ActionSuccess<TData | undefined> {
  return { ok: true, data };
}

export function failure(message: string, fieldErrors?: FieldErrors): ActionFailure {
  return fieldErrors ? { ok: false, message, fieldErrors } : { ok: false, message };
}

/**
 * 서비스·검증 예외를 화면용 실패 값으로 바꾼다.
 * `AppError` 가 아닌 예외는 내용을 숨기고 공통 문구만 돌려준다.
 *
 * Next 의 리다이렉트·`notFound()` 는 예외로 전달된다. 그것까지 삼키면 Server Action
 * 뒤의 화면 이동이 조용히 사라진다. 우리 오류를 보기 전에 먼저 돌려보낸다. (EV-0015)
 */
/** 값이 섞일 수 없는 모양(대문자·숫자·밑줄, 64자 이하)일 때만 돌려준다. */
function constantCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const message = error.message.trim();
  return /^[A-Z0-9_]{3,64}$/.test(message) ? message : undefined;
}

export function toFailure(error: unknown): ActionFailure {
  unstable_rethrow(error);

  if (error instanceof AppError) {
    return failure(error.message, error.fieldErrors);
  }

  if (error instanceof ZodError) {
    return failure("입력값을 다시 확인해 주세요.", toFieldErrors(error));
  }

  console.error("server_action_error", {
    name: error instanceof Error ? error.name : "Unknown",
    /*
     * **우리 코드가 던진 상수 코드일 때만** 메시지를 남긴다.
     *
     * 이름만 남기면 운영 기록에 `{ name: 'Error' }` 한 줄이 떨어져 **무엇이 깨졌는지
     * 알 방법이 없다.** 스테이징에서 사진 올리기가 실패했을 때 기록이 이것뿐이어서
     * 원인을 좁히지 못했다 (OBSERVED 2026-11-15, EV-0019).
     *
     * 그렇다고 메시지를 그대로 남기면 외부 라이브러리 오류에 입력값이 섞여 들어올 수
     * 있다(`CLAUDE.md` 4장). 그래서 **대문자·숫자·밑줄로만 된 짧은 문자열**, 즉 우리가
     * 코드에 박아 둔 상수(`MEDIA_PUBLIC_URL_MISSING` 같은 것)만 통과시킨다.
     * 사람 이름·연락처·파일 이름은 이 모양을 만들 수 없다.
     */
    code: constantCode(error),
  });

  return failure(UNEXPECTED_MESSAGE);
}

/**
 * 클라이언트가 보낸 값을 서버에서 **다시** 검증한다.
 * 클라이언트 검증 결과는 신뢰하지 않는다. (CLAUDE.md 7장)
 */
export function parseInput<TOutput>(
  schema: ZodType<TOutput>,
  raw: unknown,
): { ok: true; value: TOutput } | { ok: false; failure: ActionFailure } {
  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }

  return {
    ok: false,
    failure: failure("입력값을 다시 확인해 주세요.", toFieldErrors(parsed.error)),
  };
}

/**
 * 공개 제출·조회 Server Action 에도 Route Handler 와 같은 요청 횟수 제한을 적용한다.
 *
 * BE 의 `enforceRateLimit()` 은 `x-forwarded-for` 헤더만 보므로, 화면에는 `Request` 가
 * 없어 그 헤더만 담은 요청 객체를 만들어 넘긴다. 제한 로직을 FE 에서 따로 구현하지 않기
 * 위한 방법이다. (조정자 요청 항목: 헤더만 받는 변형 함수가 있으면 더 깔끔하다)
 */
export async function enforcePublicRateLimit(scope: string): Promise<void> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for") ?? "";
  enforceRateLimit(
    new Request("http://internal.invalid/", {
      headers: { "x-forwarded-for": forwarded },
    }),
    scope,
  );
}

/**
 * 세션 쿠키를 심는다. 속성은 BE 의 `sessionCookieHeader()` 와 같게 맞춘다.
 * (Path=/, HttpOnly, SameSite=Lax, 운영에서는 Secure)
 */
export async function writeSessionCookie(
  scope: SessionScope,
  token: string,
  maxAgeSeconds: number | null,
): Promise<void> {
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE_NAMES[scope],
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    ...(maxAgeSeconds === null ? {} : { maxAge: maxAgeSeconds }),
  });
}

/** 해당 범위의 세션 행과 쿠키를 함께 지운다. */
export async function destroySessionAndCookie(scope: SessionScope): Promise<void> {
  const jar = await cookies();
  const name = SESSION_COOKIE_NAMES[scope];
  const token = jar.get(name)?.value;

  if (token) {
    await destroySession(
      new Request("http://internal.invalid/", {
        headers: { cookie: `${name}=${encodeURIComponent(token)}` },
      }),
      scope,
    );
  }

  jar.delete(name);
}

/** `FormData` 를 평평한 문자열 맵으로 바꾼다. 파일 입력은 쓰지 않는다. */
export function formEntries(formData: FormData): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      raw[key] = value;
    }
  }
  return raw;
}

export function isNonEmptyString(value: FormDataEntryValue): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * 올라온 파일을 메모리로 읽는다. 비어 있는 입력란은 `null` 이다.
 * 형식·용량 검사는 서비스 계층에서 한다. 이 함수는 옮기기만 한다.
 */
export async function readUploadedFile(
  value: FormDataEntryValue | null,
): Promise<{ filename: string; bytes: Uint8Array } | null> {
  if (!value || typeof value === "string") return null;
  if (value.size === 0) return null;

  return {
    filename: value.name,
    bytes: new Uint8Array(await value.arrayBuffer()),
  };
}

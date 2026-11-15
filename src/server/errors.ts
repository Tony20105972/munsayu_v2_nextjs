import { ERROR_CODES, type ErrorCode } from "@/lib/contracts";

/**
 * 서비스 계층이 던지는 유일한 오류 타입. Route Handler가 이것만 보고 상태 코드를 정한다.
 * `message`에는 사용자에게 보여 줄 문구만 담고 개인정보·내부 식별자는 넣지 않는다. (BLUEPRINT 10장)
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function validationFailed(fieldErrors: Record<string, string[]>): AppError {
  return new AppError(
    ERROR_CODES.VALIDATION_FAILED,
    422,
    "입력값을 다시 확인해 주세요.",
    fieldErrors,
  );
}

export function intakeClosed(): AppError {
  return new AppError(ERROR_CODES.INTAKE_CLOSED, 409, "지금은 접수를 받지 않습니다.");
}

export function notFound(): AppError {
  return new AppError(ERROR_CODES.NOT_FOUND, 404, "대상을 찾을 수 없습니다.");
}

export function unauthenticated(): AppError {
  return new AppError(ERROR_CODES.UNAUTHENTICATED, 401, "로그인이 필요합니다.");
}

export function forbidden(): AppError {
  return new AppError(ERROR_CODES.FORBIDDEN, 403, "권한이 없습니다.");
}

/**
 * AD-016 임시 비밀번호로 들어온 계정이 비밀번호를 바꾸기 전에 다른 일을 하려 할 때.
 * 새 오류 코드를 만들지 않고 403 을 쓴다 — 바깥 계약(`ERROR_CODES`)을 늘리지 않는다.
 */
export function passwordChangeRequired(): AppError {
  return new AppError(
    ERROR_CODES.FORBIDDEN,
    403,
    "임시 비밀번호로 들어왔습니다. 비밀번호를 먼저 바꿔 주세요.",
  );
}

export function conflict(message = "이미 사용 중인 값입니다."): AppError {
  return new AppError(ERROR_CODES.CONFLICT, 409, message);
}

export function rateLimited(
  message = "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
): AppError {
  return new AppError(ERROR_CODES.RATE_LIMITED, 429, message);
}

export function tokenInvalid(): AppError {
  return new AppError(
    ERROR_CODES.TOKEN_INVALID,
    400,
    "링크가 만료되었거나 이미 사용되었습니다.",
  );
}

/**
 * 내보낼 줄이 상한을 넘었다. 잘라내지 않고 범위를 좁히라고 알려 준다. (ASM-097)
 * 메시지에 담는 것은 **상한뿐**이고 개인정보도, 실제 건수도 넣지 않는다.
 */
export function exportTooLarge(max: number): AppError {
  return new AppError(
    ERROR_CODES.CONFLICT,
    409,
    `한 번에 ${max.toLocaleString("ko-KR")}건까지 받을 수 있습니다. ` +
      `기간이나 조건을 좁혀 주세요.`,
  );
}

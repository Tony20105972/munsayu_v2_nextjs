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

import { z } from "zod";

/**
 * 공유 계약의 기본 조각들. FE 폼 검증과 BE 입력 검증이 같은 스키마를 쓴다.
 * 원본 계약 문서: docs/contracts/openapi.yaml, docs/contracts/architecture.md
 */

/** 같은 신청서의 재전송만 막는 키. 의도적인 재신청은 막지 않는다. (ASM-001) */
export const idempotencyKeySchema = z.string().min(16).max(128);

/** 레거시 placeholder `010-0000-0000` 기준. 하이픈 유무를 모두 받고 표준형으로 바꾼다. (EV-0006) */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[^0-9]/g, ""))
  .refine((digits) => /^01[016789][0-9]{7,8}$/.test(digits), {
    message: "휴대폰 번호 형식이 올바르지 않습니다.",
  })
  .transform((digits) =>
    digits.length === 10
      ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
      : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`,
  );

/** 레거시 입력란 안내 문구: `실명을 입력하세요` (EV-0006) */
export const personNameSchema = z.string().trim().min(2).max(40);

/** 필수 동의 체크박스. 체크하지 않으면 422. (EV-0006) */
export const requiredConsentSchema = z.literal(true, {
  message: "개인정보 수집 및 이용에 동의해야 신청할 수 있습니다.",
});

export const cuidLikeIdSchema = z.string().trim().min(1).max(64);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

/** 관리자 목록·응답에서 쓰는 마스킹. 원문은 별도 권한 조회에서만 노출하고 기록을 남긴다. (AD-013) */
export function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 9) return "*".repeat(digits.length);
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  return `${head}-${"*".repeat(digits.length - 7)}-${tail}`;
}

export function maskSchoolName(schoolName: string): string {
  if (schoolName.length <= 2) return `${schoolName[0]}*`;
  return `${schoolName.slice(0, 2)}${"*".repeat(schoolName.length - 2)}`;
}

/** 응답 본문과 로그에 쓰는 오류 코드. 개인정보를 담지 않는다. (BLUEPRINT 10장) */
export const ERROR_CODES = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INTAKE_CLOSED: "INTAKE_CLOSED",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  TOKEN_INVALID: "TOKEN_INVALID",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ApiError = {
  code: ErrorCode;
  /** 사용자에게 보여 줄 문구. 개인정보·내부 식별자를 넣지 않는다. */
  message: string;
  /** 필드별 검증 오류. 값은 넣지 않고 필드 이름과 사유만 넣는다. */
  fieldErrors?: Record<string, string[]>;
};

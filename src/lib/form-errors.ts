import type { z } from "zod";

/** 필드 이름 → 오류 문구 목록. 값(입력 내용)은 담지 않는다. (BLUEPRINT 10장) */
export type FieldErrors = Record<string, string[]>;

/** 폼 전체에 해당하는 오류를 담는 키. */
export const FORM_ERROR_KEY = "form";

type ZodIssue = z.ZodError["issues"][number];

const HANGUL_PATTERN = /[가-힣]/;

/**
 * 공유 계약이 직접 적어 둔 문구는 모두 한국어다.
 * Zod 기본 문구(영어)가 그대로 화면에 나오지 않도록 같은 뜻의 한국어로 바꾼다.
 * 계약은 바꾸지 않고 화면 쪽에서만 바꿔 쓴다. // ASM-058
 */
function toKoreanMessage(issue: ZodIssue): string {
  switch (issue.code) {
    case "too_small":
      return issue.origin === "string"
        ? `${issue.minimum}자 이상 입력해 주세요.`
        : `${issue.minimum} 이상이어야 합니다.`;
    case "too_big":
      return issue.origin === "string"
        ? `${issue.maximum}자까지 입력할 수 있습니다.`
        : `${issue.maximum} 이하여야 합니다.`;
    case "invalid_type":
      return "값을 입력해 주세요.";
    case "invalid_value":
      return "선택할 수 있는 값 중에서 골라 주세요.";
    case "invalid_format":
      return issue.format === "email"
        ? "이메일 주소 형식이 올바르지 않습니다."
        : "입력 형식이 올바르지 않습니다.";
    default:
      return "입력값을 확인해 주세요.";
  }
}

/**
 * Zod 검증 실패를 화면에서 쓰기 좋은 필드별 문구 묶음으로 바꾼다.
 * 계약(`src/lib/contracts/`)의 스키마를 그대로 쓰고, 계약이 가진 한국어 문구를 우선한다.
 */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const key =
      issue.path.length > 0 ? issue.path.map(String).join(".") : FORM_ERROR_KEY;
    const message = HANGUL_PATTERN.test(issue.message)
      ? issue.message
      : toKoreanMessage(issue);
    const messages = fieldErrors[key] ?? [];
    messages.push(message);
    fieldErrors[key] = messages;
  }

  return fieldErrors;
}

/** `aria-describedby`에 넣을 오류 영역 id. */
export function errorElementId(formId: string, field: string): string {
  return `${formId}-${field}-error`;
}

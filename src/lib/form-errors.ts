import type { z } from "zod";

/** 필드 이름 → 오류 문구 목록. 값(입력 내용)은 담지 않는다. (BLUEPRINT 10장) */
export type FieldErrors = Record<string, string[]>;

/** 폼 전체에 해당하는 오류를 담는 키. */
export const FORM_ERROR_KEY = "form";

/**
 * Zod 검증 실패를 화면에서 쓰기 좋은 필드별 문구 묶음으로 바꾼다.
 *
 * 문구는 공유 계약이 전역으로 설정한 한국어 문구(`src/lib/contracts/locale.ts`)를
 * 그대로 쓴다. FE에서 다시 번역하지 않으므로 같은 입력에 대해 서버 응답의
 * `fieldErrors` 와 화면 문구가 항상 같다.
 */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const key =
      issue.path.length > 0 ? issue.path.map(String).join(".") : FORM_ERROR_KEY;
    const messages = fieldErrors[key] ?? [];
    messages.push(issue.message);
    fieldErrors[key] = messages;
  }

  return fieldErrors;
}

/** `aria-describedby`에 넣을 오류 영역 id. */
export function errorElementId(formId: string, field: string): string {
  return `${formId}-${field}-error`;
}

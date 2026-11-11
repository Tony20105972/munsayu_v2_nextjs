import type { FieldErrors } from "@/lib/form-errors";

/**
 * Server Action 의 공통 반환 형태.
 *
 * - 성공·실패를 예외가 아니라 값으로 돌려준다. 폼이 필드별 오류를 그대로 그릴 수 있다.
 * - `message` 와 `fieldErrors` 에는 개인정보를 담지 않는다. (BLUEPRINT 10장)
 * - 이 파일은 클라이언트 컴포넌트에서도 import 하므로 서버 모듈을 끌어오지 않는다.
 */
export type ActionFailure = {
  ok: false;
  /** 사용자에게 보여 줄 한 줄 문구. */
  message: string;
  fieldErrors?: FieldErrors;
};

export type ActionSuccess<TData> = {
  ok: true;
  data: TData;
};

export type ActionResult<TData = undefined> = ActionSuccess<TData> | ActionFailure;

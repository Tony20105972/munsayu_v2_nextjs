import { z } from "zod";

/**
 * 공유 계약의 검증 오류 문구를 한국어로 맞춘다.
 *
 * Zod 기본 문구는 영어이고 `z.locales.ko()`는 "string이 너무 작습니다"처럼 어색하다.
 * 신청자 대부분이 학부모이므로 화면에 바로 보여 줄 수 있는 문장으로 바꾼다.
 * 계약을 import하면 FE·BE 양쪽에서 같은 문구가 나온다. // ASM-058
 */
const 전화번호 = "휴대폰 번호 형식이 올바르지 않습니다.";

function describeOrigin(origin: unknown): string {
  return origin === "string" ? "자" : "";
}

z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type":
        return issue.input === undefined || issue.input === null
          ? "필수 항목입니다."
          : "입력 형식이 올바르지 않습니다.";
      case "too_small": {
        const unit = describeOrigin(issue.origin);
        if (issue.origin === "string") {
          return issue.minimum === 1
            ? "필수 항목입니다."
            : `${issue.minimum}${unit} 이상 입력해 주세요.`;
        }
        if (issue.origin === "array") {
          return `${issue.minimum}개 이상 선택해 주세요.`;
        }
        return `${issue.minimum} 이상이어야 합니다.`;
      }
      case "too_big": {
        const unit = describeOrigin(issue.origin);
        if (issue.origin === "string") {
          return `${issue.maximum}${unit}까지 입력할 수 있습니다.`;
        }
        if (issue.origin === "array") {
          return `${issue.maximum}개까지 선택할 수 있습니다.`;
        }
        return `${issue.maximum} 이하여야 합니다.`;
      }
      case "invalid_format":
        if (issue.format === "email") return "이메일 주소 형식이 올바르지 않습니다.";
        if (issue.format === "regex") return 전화번호;
        return "입력 형식이 올바르지 않습니다.";
      case "invalid_value":
        return "선택할 수 있는 값이 아닙니다.";
      case "not_multiple_of":
        return "허용되지 않는 값입니다.";
      case "unrecognized_keys":
        return "허용되지 않는 항목이 들어 있습니다.";
      default:
        return "입력을 다시 확인해 주세요.";
    }
  },
});

export {};

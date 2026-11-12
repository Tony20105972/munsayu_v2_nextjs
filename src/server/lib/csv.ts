import "server-only";

/**
 * 관리자 CSV 내보내기의 단일 구현. 모든 신청 종류가 같은 규칙을 쓴다. (AD-013)
 *
 * 값은 모두 따옴표로 감싸고 안쪽 따옴표는 두 번 적는다.
 * `=`·`+`·`-`·`@` 로 시작하는 값은 표 계산 프로그램이 수식으로 읽을 수 있어
 * 앞에 작은따옴표를 붙여 글자로 고정한다.
 */

const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export function csvCell(value: unknown): string {
  const text = String(value ?? "");
  const guarded = FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix))
    ? `'${text}`
    : text;
  return `"${guarded.replaceAll('"', '""')}"`;
}

export function csvRows(header: string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

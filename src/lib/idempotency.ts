/**
 * 신청·예약 폼 1회분의 중복 제출 방지 키.
 * 폼을 열 때 한 번 만들고, 같은 신청을 다시 보낼 때는 같은 키를 그대로 쓴다.
 * 계약의 `idempotencyKeySchema` 는 16~128자를 요구한다. (src/lib/contracts/common.ts)
 */
export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // randomUUID 를 쓸 수 없는 환경(구형 브라우저·비보안 컨텍스트)의 대비책.
  const randomPart = Math.random().toString(36).slice(2);
  return `fallback-${Date.now().toString(36)}-${randomPart}`.padEnd(24, "0");
}

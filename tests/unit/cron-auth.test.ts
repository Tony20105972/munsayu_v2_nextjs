import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cronRequestAuthorized } from "@/server/auth/cron";

/**
 * Phase 7 파기 예약 실행의 인증 경계. (AD-013, ASM-100)
 *
 * 이 함수는 사람의 세션 없이 도는 경로의 **유일한 문턱**이다. 여기가 새면 누구나
 * 신청자 개인정보를 지울 수 있고, 파기는 되돌릴 수 없다. 그래서 통과·차단을 고정한다.
 */
const original = process.env.CRON_SECRET;

function request(authorization?: string): Request {
  return new Request("https://example.test/api/cron/privacy-purge", {
    method: "GET",
    headers: authorization === undefined ? undefined : { authorization },
  });
}

describe("Phase 7 파기 예약 실행 인증", () => {
  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("비밀값이 설정되지 않았으면 아무도 통과하지 못한다", () => {
    expect(cronRequestAuthorized(request())).toBe(false);
    expect(cronRequestAuthorized(request("Bearer "))).toBe(false);
    expect(cronRequestAuthorized(request("Bearer undefined"))).toBe(false);
  });

  it("공백뿐인 비밀값도 설정 안 된 것으로 본다", () => {
    process.env.CRON_SECRET = "   ";
    expect(cronRequestAuthorized(request("Bearer    "))).toBe(false);
    expect(cronRequestAuthorized(request("Bearer"))).toBe(false);
  });

  it("헤더가 없거나 값이 틀리면 통과시키지 않는다", () => {
    process.env.CRON_SECRET = "phase7-test-cron-value";
    expect(cronRequestAuthorized(request())).toBe(false);
    expect(cronRequestAuthorized(request("Bearer wrong-value"))).toBe(false);
    // 한 글자만 다른 경우
    expect(cronRequestAuthorized(request("Bearer phase7-test-cron-valuE"))).toBe(false);
    // 접두사 없이 값만 보낸 경우
    expect(cronRequestAuthorized(request("phase7-test-cron-value"))).toBe(false);
    // 다른 인증 방식으로 위장한 경우
    expect(cronRequestAuthorized(request("Basic phase7-test-cron-value"))).toBe(false);
    // 뒤에 덧붙인 경우
    expect(cronRequestAuthorized(request("Bearer phase7-test-cron-value extra"))).toBe(
      false,
    );
  });

  it("맞는 비밀값이면 통과한다", () => {
    process.env.CRON_SECRET = "phase7-test-cron-value";
    expect(cronRequestAuthorized(request("Bearer phase7-test-cron-value"))).toBe(true);
  });

  it("환경 변수의 양끝 공백은 떼어 내고 비교한다", () => {
    process.env.CRON_SECRET = "  phase7-test-cron-value  ";
    expect(cronRequestAuthorized(request("Bearer phase7-test-cron-value"))).toBe(true);
  });
});

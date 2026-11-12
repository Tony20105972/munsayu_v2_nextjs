import { afterEach, describe, expect, it } from "vitest";
import { readAnalyticsProviderId } from "@/components/layout/analytics-script";

/**
 * AD-012 방문 통계 도구 연동 자리.
 * 자체 집계는 만들지 않고, 환경 변수가 비어 있으면 스크립트를 넣지 않는다. (ASM-004)
 */
describe("AD-012 분석 도구 연동 자리", () => {
  const original = process.env.ANALYTICS_PROVIDER_ID;

  afterEach(() => {
    if (original === undefined) delete process.env.ANALYTICS_PROVIDER_ID;
    else process.env.ANALYTICS_PROVIDER_ID = original;
  });

  it("AD-012: 환경 변수가 없으면 분석 ID를 읽지 않는다", () => {
    delete process.env.ANALYTICS_PROVIDER_ID;
    expect(readAnalyticsProviderId()).toBeNull();
  });

  it("AD-012: 환경 변수가 빈 값이거나 공백뿐이면 넣지 않은 것으로 본다", () => {
    process.env.ANALYTICS_PROVIDER_ID = "";
    expect(readAnalyticsProviderId()).toBeNull();
    process.env.ANALYTICS_PROVIDER_ID = "   ";
    expect(readAnalyticsProviderId()).toBeNull();
  });

  it("AD-012: 값이 있으면 앞뒤 공백을 떼고 그대로 쓴다", () => {
    process.env.ANALYTICS_PROVIDER_ID = "  G-TESTONLY123  ";
    expect(readAnalyticsProviderId()).toBe("G-TESTONLY123");
  });
});

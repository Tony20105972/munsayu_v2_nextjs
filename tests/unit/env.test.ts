import { afterEach, describe, expect, it } from "vitest";
import { envValue, envValueOr, requireEnvValue } from "@/server/env";

/**
 * 환경 변수 읽기 규칙. 빈 문자열·공백뿐인 값은 "값 없음"으로 본다.
 * `SEED_ADMIN_PASSWORD=` 처럼 키만 남은 줄 때문에 빈 비밀번호가 해시되는 일을 막는다.
 */
const KEY = "MUNSAYU_TEST_ENV_VALUE";

describe("환경 변수 읽기", () => {
  afterEach(() => {
    delete process.env[KEY];
  });

  it("키가 없으면 undefined", () => {
    delete process.env[KEY];
    expect(envValue(KEY)).toBeUndefined();
  });

  it("빈 문자열·공백뿐이면 값 없음으로 본다", () => {
    process.env[KEY] = "";
    expect(envValue(KEY)).toBeUndefined();
    process.env[KEY] = "   \t ";
    expect(envValue(KEY)).toBeUndefined();
  });

  it("값이 있으면 앞뒤 공백을 떼고 돌려준다", () => {
    process.env[KEY] = "  value-only  ";
    expect(envValue(KEY)).toBe("value-only");
  });

  it("빈 값에는 기본값을 쓴다", () => {
    process.env[KEY] = "";
    expect(envValueOr(KEY, "fallback")).toBe("fallback");
    process.env[KEY] = "real";
    expect(envValueOr(KEY, "fallback")).toBe("real");
  });

  it("필수 값이 비면 키 이름만 담아 던진다 — 값은 메시지에 넣지 않는다", () => {
    process.env[KEY] = "   ";
    expect(() => requireEnvValue(KEY)).toThrowError(new RegExp(KEY));
    process.env[KEY] = "value-must-not-leak";
    expect(requireEnvValue(KEY)).toBe("value-must-not-leak");
    try {
      delete process.env[KEY];
      requireEnvValue(KEY);
    } catch (error) {
      expect((error as Error).message).not.toContain("value-must-not-leak");
    }
  });
});

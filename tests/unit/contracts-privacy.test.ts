import { describe, expect, it } from "vitest";
import { maskName, maskPhone, maskSchoolName, phoneSchema } from "@/lib/contracts";

/** 관리자 목록은 이름·연락처를 기본으로 가린다. (BLUEPRINT 10장, AD-013) */
describe("AD-013 개인정보 마스킹", () => {
  it("AD-013: 이름은 가운데를 가린다", () => {
    expect(maskName("홍길동")).toBe("홍*동");
    expect(maskName("남궁민수")).toBe("남**수");
    expect(maskName("김민")).toBe("김*");
    expect(maskName("김")).toBe("김");
  });

  it("AD-013: 연락처는 가운데 자리만 가리고 앞 3자리·뒤 4자리를 남긴다", () => {
    expect(maskPhone("010-1234-5678")).toBe("010-****-5678");
    expect(maskPhone("01012345678")).toBe("010-****-5678");
    expect(maskPhone("010-123-4567")).toBe("010-***-4567");
  });

  it("AD-013: 마스킹 결과에 원문 가운데 값이 남지 않는다", () => {
    expect(maskPhone("010-1234-5678")).not.toContain("1234");
    expect(maskName("홍길동")).not.toContain("길");
  });

  it("AD-013: 학교 이름은 앞 두 글자만 남긴다", () => {
    expect(maskSchoolName("대치초등학교")).toBe("대치****");
    expect(maskSchoolName("가나")).toBe("가*");
  });
});

describe("휴대폰 번호 정규화", () => {
  it("하이픈 유무와 공백을 모두 받아 같은 표준형으로 바꾼다", () => {
    expect(phoneSchema.parse(" 010 1234 5678 ")).toBe("010-1234-5678");
    expect(phoneSchema.parse("010-1234-5678")).toBe("010-1234-5678");
    expect(phoneSchema.parse("01012345678")).toBe("010-1234-5678");
  });

  it("구 번호대는 10자리도 받고 3-3-4로 바꾼다", () => {
    expect(phoneSchema.parse("011-123-4567")).toBe("011-123-4567");
    expect(phoneSchema.parse("0111234567")).toBe("011-123-4567");
  });

  it("휴대폰이 아닌 번호는 거부한다", () => {
    for (const value of ["025635972", "02-563-5972", "031-713-5972", "", "123"]) {
      expect(phoneSchema.safeParse(value).success).toBe(false);
    }
  });

  it("010은 11자리만 받는다 — 10자리 010 번호는 존재하지 않는다", () => {
    expect(phoneSchema.safeParse("010-0000-000").success).toBe(false);
    expect(phoneSchema.safeParse("0100000000").success).toBe(false);
    expect(phoneSchema.safeParse("010-0000-0000").success).toBe(true);
  });
});

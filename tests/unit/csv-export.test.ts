import { describe, expect, it } from "vitest";
import { takeForExport } from "@/server/lib/csv-export";

/**
 * ASM-097 — CSV 내보내기 상한.
 *
 * 조용히 잘라내면 「현재 필터 결과 전체」(ASM-006)가 거짓이 된다. 상한을 넘으면
 * 거절해야 하고, 딱 상한까지는 통과해야 한다. 경계값을 함께 확인한다.
 */
describe("CSV 내보내기 상한", () => {
  const rowsOf = (count: number) => Array.from({ length: count }, (_, i) => ({ i }));

  it("상한보다 적으면 그대로 돌려준다", async () => {
    const rows = await takeForExport(async (take) => {
      expect(take).toBe(11); // 상한+1 만큼만 읽는다
      return rowsOf(5);
    }, 10);
    expect(rows).toHaveLength(5);
  });

  it("딱 상한이면 통과한다 (경계값)", async () => {
    const rows = await takeForExport(async () => rowsOf(10), 10);
    expect(rows).toHaveLength(10);
  });

  it("상한을 한 줄이라도 넘으면 거절한다", async () => {
    await expect(takeForExport(async () => rowsOf(11), 10)).rejects.toMatchObject({
      name: "AppError",
      code: "CONFLICT",
      status: 409,
    });
  });

  it("거절 문구에 상한은 담고 실제 건수·개인정보는 담지 않는다", async () => {
    try {
      await takeForExport(async () => rowsOf(11), 10);
      throw new Error("거절했어야 한다");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("10건");
      // 실제 건수(11)를 흘리지 않는다
      expect(message).not.toContain("11");
      expect(message).toContain("좁혀");
    }
  });

  it("읽는 양이 상한+1 로 묶인다 — 표 전체를 올리지 않는다", async () => {
    let asked = 0;
    await takeForExport(async (take) => {
      asked = take;
      return rowsOf(take);
    }, 100).catch(() => undefined);
    expect(asked).toBe(101);
  });
});

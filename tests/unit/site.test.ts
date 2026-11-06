import { describe, expect, it } from "vitest";
import { siteName } from "../../src/lib/site";

describe("PG-000 harness home", () => {
  it("uses the migration site name", () => {
    expect(siteName).toBe("Munsayu V2");
  });
});

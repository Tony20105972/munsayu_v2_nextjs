import { expect, test } from "@playwright/test";
import rules from "../../docs/contracts/route-compatibility-map.json";

/**
 * RT-001 / RT-002 / RT-004 레거시 URL 호환.
 * 계약 원본은 `docs/contracts/route-compatibility-map.json` 하나뿐이므로 그 파일을 읽어 검증한다.
 * 운영 사이트에는 접속하지 않는다.
 */
test.describe("RT 레거시 URL 호환", () => {
  const redirects = rules.rules.filter((rule) => rule.action === "308");
  const gone = rules.rules.filter((rule) => rule.action === "410");
  const kept = rules.rules.filter((rule) => rule.action === "maintain");

  for (const rule of redirects) {
    const from = rule.legacy.replace("{id}", "7");
    const to = (rule.target ?? "").replace("{id}", "7");
    test(`RT-001/002 ${from} → 308 ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(response.headers()["location"]).toContain(to);
    });
  }

  for (const rule of gone) {
    const probe = rule.legacy.replace("/**", "/index.php");
    test(`RT-004 ${probe} → 410, 본문에 /admin 노출 없음`, async ({ request }) => {
      const response = await request.get(probe, { maxRedirects: 0 });
      expect(response.status()).toBe(410);
      expect(await response.text()).not.toContain("/admin");
    });
  }

  for (const rule of kept) {
    test(`PG 유지 경로 ${rule.legacy} → 200`, async ({ request }) => {
      const response = await request.get(rule.legacy);
      expect(response.status()).toBe(200);
    });
  }

  test("RT-003 외부 입학진단 링크는 그대로 둔다", async ({ page }) => {
    await page.goto("/");
    const external = rules.rules.find((rule) => rule.action === "external-maintain");
    expect(external).toBeTruthy();
    await expect(page.locator(`a[href="${external?.target}"]`).first()).toHaveAttribute(
      "href",
      external?.target ?? "",
    );
  });

  test("AD-012 분석 ID가 없으면 분석 스크립트를 넣지 않는다", async ({ page }) => {
    // 개발·테스트 환경은 ANALYTICS_PROVIDER_ID 가 비어 있다. (ASM-004)
    await page.goto("/");
    await expect(page.locator("script[data-analytics]")).toHaveCount(0);
    await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
  });
});

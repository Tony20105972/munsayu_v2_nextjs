import { expect, test } from "@playwright/test";

test("PG-000: home page is reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Munsayu V2" })).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { SEED_MEMBER, loginAsAdmin, submitUntilNavigated } from "./helpers";

/**
 * C-3 통합 흐름 4 — AD-001 관리자 접근 통제.
 * 권한은 요청마다 서버에서 확인한다. 화면에서 숨기는 것은 권한 처리가 아니다. (BLUEPRINT 7장)
 */
const ADMIN_PATHS = [
  "/admin",
  "/admin/members",
  "/admin/events",
  "/admin/instructors",
  "/admin/courses",
  "/admin/applications",
  "/admin/privacy",
  "/admin/analytics",
] as const;

test.describe("AD-001 관리자 접근 통제", () => {
  for (const path of ADMIN_PATHS) {
    test(`AD-001 비로그인은 ${path} 에 들어갈 수 없다`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(page.getByRole("button", { name: "관리자 로그인" })).toBeVisible();
    });
  }

  test("AD-001 회원 세션으로는 관리자 화면에 들어갈 수 없다", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="loginId"]').fill(SEED_MEMBER.loginId);
    await page.locator('input[name="password"]').fill(SEED_MEMBER.password);
    await submitUntilNavigated(page, /로그인/, /^(?!\/login)/);

    for (const path of ADMIN_PATHS) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    }
  });

  test("AD-001 회원 계정은 관리자 로그인 화면을 통과하지 못한다", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("관리자 아이디").fill(SEED_MEMBER.loginId);
    await page.locator('input[name="password"]').fill(SEED_MEMBER.password);
    await page.getByRole("button", { name: "관리자 로그인" }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("AD-001 관리자는 로그인하고 로그아웃하면 다시 막힌다", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/applications");
    await expect(page.getByRole("heading", { name: "신청 목록" })).toBeVisible();

    await page.getByRole("button", { name: "로그아웃" }).click();
    await page.goto("/admin/applications");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

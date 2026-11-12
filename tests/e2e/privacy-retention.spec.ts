import { expect, test } from "@playwright/test";
import { COURSE_PRIVACY_CONSENT, EVENT_PRIVACY_CONSENT } from "../../src/lib/contracts";
import { loginAsAdmin } from "./helpers";

/**
 * BZ-002 — 보존 설정의 문구가 **신청자가 보는 화면**에 그대로 나오는지 확인한다.
 *
 * 독립 리뷰에서 지적된 부분이다. 이전에는 모달이 코드 상수를 보여 주고 있어서
 * 관리자가 문구를 바꿔도 공개 화면이 바뀌지 않았고, 통합 테스트는 화면이 쓰지 않는
 * `/api/privacy-notice` 응답만 보고 있었다.
 */
const CHANGED_COURSE = "E2E 확인용 강좌 보유기간 문구";
const CHANGED_EVENT = "E2E 확인용 설명회 보유기간 문구";

/** 이미 관리자로 로그인돼 있으면 다시 로그인하지 않는다. */
async function ensureAdminOnPrivacyPage(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/admin/privacy");
  if (page.url().includes("/admin/login")) {
    await loginAsAdmin(page);
    await page.goto("/admin/privacy");
  }
}

/**
 * 보존 문구를 바꾸고 **서버에 실제로 저장됐는지**까지 확인한다.
 *
 * 입력란 값만 보면 hydration 전에 눌려 사라진 클릭을 걸러내지 못한다(타이핑한 값이 그대로
 * 남아 있어 통과한다). 저장 뒤 새로 고쳐서 서버가 돌려준 값으로 확인한다.
 */
async function setRetentionPolicies(
  page: import("@playwright/test").Page,
  course: string,
  event: string,
): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await ensureAdminOnPrivacyPage(page);
    await page.getByLabel("강좌 신청 보유기간 문구").fill(course);
    await page.getByLabel("설명회 예약 보유기간 문구").fill(event);
    await page.getByRole("button", { name: "보존 설정 저장" }).click();
    await page.waitForTimeout(500);

    await page.reload();
    const saved = await page.getByLabel("강좌 신청 보유기간 문구").inputValue();
    const savedEvent = await page.getByLabel("설명회 예약 보유기간 문구").inputValue();
    if (saved === course && savedEvent === event) return;
  }
  throw new Error("보존 설정이 서버에 저장되지 않았습니다.");
}

test.describe("BZ-002 보존 문구가 공개 동의 안내에 반영된다", () => {
  test.afterEach(async ({ page }) => {
    // 다른 테스트와 기준 이미지에 영향을 주지 않도록 기본 문구로 되돌린다.
    await setRetentionPolicies(
      page,
      COURSE_PRIVACY_CONSENT.retention,
      EVENT_PRIVACY_CONSENT.retention,
    );
  });

  test("BZ-002 관리자가 바꾼 문구가 강좌 신청 모달의 보유기간에 나온다", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await setRetentionPolicies(page, CHANGED_COURSE, CHANGED_EVENT);

    await page.goto("/sub/schedule.n");
    await page.getByRole("button", { name: "수강예약" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(CHANGED_COURSE);
    await expect(dialog).not.toContainText(COURSE_PRIVACY_CONSENT.retention);
  });

  test("BZ-002 관리자가 바꾼 문구가 설명회 예약 모달의 보유기간에 나온다", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await setRetentionPolicies(page, CHANGED_COURSE, CHANGED_EVENT);

    await page.goto("/sub/Presentation");
    const reserveButton = page.getByRole("button", { name: "설명회 신청" }).first();
    await reserveButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(CHANGED_EVENT);
    await expect(dialog).not.toContainText(EVENT_PRIVACY_CONSENT.retention);
  });
});

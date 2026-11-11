import { expect, test } from "@playwright/test";
import {
  createPhoneFactory,
  submitUntilNavigated,
  submitUntilTextVisible,
  unique,
  waitForMail,
} from "./helpers";

/**
 * C-3 통합 흐름 3 — FM-003 회원 가입 → 로그인 → 비밀번호 재설정(메일) → 새 비밀번호 로그인.
 *
 * 메일은 실제로 보내지 않고 file 어댑터가 남긴 파일을 읽는다. (D4, ASM-010)
 * 입력란은 `name` 속성으로 찾는다. 라벨 글자에 필수 표시가 붙어 있어 라벨 문자열로는
 * `비밀번호` 와 `비밀번호 확인` 을 가릴 수 없다.
 */
/** 이 파일 전용 번호 구간. 다른 파일과 뒤 4자리가 겹치지 않게 한다. */
const fakePhone = createPhoneFactory(5000);

test.describe("FM-003 회원 계정 전체 흐름", () => {
  test("가입 → 로그아웃 → 로그인 → 비밀번호 재설정 → 새 비밀번호로 로그인", async ({
    page,
  }) => {
    const loginId = unique("e2e_");
    const email = `${loginId}@munsayu.local`;
    const password = "e2epassword123";
    const nextPassword = "e2enewpassword456";

    // 가입 1단계: 약관·개인정보 동의
    await page.goto("/register");
    await page.locator('input[name="termsConsent"]').check();
    await page.locator('input[name="privacyConsent"]').check();
    await page.getByRole("button", { name: /다음/ }).click();

    // 가입 2단계: 회원 정보
    await expect(page.getByRole("heading", { name: "회원 정보 입력" })).toBeVisible();
    await page.locator('input[name="loginId"]').fill(loginId);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="passwordConfirm"]').fill(password);
    await page.locator('input[name="name"]').fill("가상회원");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="phone"]').fill(fakePhone());
    await submitUntilTextVisible(page, "가입하기", /회원가입이 완료되었습니다/);

    // 가입과 함께 세션이 생기고, 내 정보 화면에서 확인된다.
    await page.goto("/account/profile");
    await expect(page.locator('input[name="email"]')).toHaveValue(email);
    await page.getByRole("button", { name: "로그아웃" }).click();

    // 가입한 비밀번호로 로그인
    await page.goto("/login");
    await page.locator('input[name="loginId"]').fill(loginId);
    await page.locator('input[name="password"]').fill(password);
    await submitUntilNavigated(page, /로그인/, /^(?!\/login)/);
    await page.goto("/account/profile");
    await expect(page.locator('input[name="email"]')).toHaveValue(email);
    await page.getByRole("button", { name: "로그아웃" }).click();

    // 비밀번호 재설정 요청 → 메일로 링크 수신 (실제 발송 없음)
    await page.goto("/account/recovery");
    const resetForm = page.locator("form").filter({
      has: page.locator('input[name="loginId"]'),
    });
    await resetForm.locator('input[name="loginId"]').fill(loginId);
    await resetForm.locator('input[name="email"]').fill(email);
    await resetForm.getByRole("button").click();

    const mail = await waitForMail(email);
    expect(mail.subject).toContain("비밀번호");
    const resetUrl = mail.text.match(/https?:\/\/\S*\/account\/password-reset\S*/)?.[0];
    expect(resetUrl, "메일 본문에 재설정 링크가 있어야 한다").toBeTruthy();

    // 링크로 새 비밀번호 설정
    const parsed = new URL(resetUrl ?? "");
    await page.goto(parsed.pathname + parsed.search);
    await page.locator('input[name="password"]').fill(nextPassword);
    await page.locator('input[name="passwordConfirm"]').fill(nextPassword);
    await page.getByRole("button", { name: /비밀번호|재설정|변경/ }).click();
    await expect(page.getByText(/바꿨|변경|다시 로그인/)).toBeVisible({
      timeout: 20_000,
    });

    // 이전 비밀번호는 막히고 새 비밀번호로는 들어간다.
    await page.goto("/login");
    await page.locator('input[name="loginId"]').fill(loginId);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: /로그인/ }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });

    await page.locator('input[name="password"]').fill(nextPassword);
    await submitUntilNavigated(page, /로그인/, /^(?!\/login)/);
    await page.goto("/account/profile");
    await expect(page.locator('input[name="email"]')).toHaveValue(email);
  });
});

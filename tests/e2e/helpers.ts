import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page } from "@playwright/test";
import { COURSE_PRIVACY_CONSENT } from "../../src/lib/contracts";
import { MAIL_OUTBOX_FILE } from "../../playwright.config";
import { fixturePassword } from "../fixtures/passwords";

/**
 * seed 가 넣는 가짜 관리자·회원. 운영 계정이 아니다.
 *
 * 비밀번호는 `prisma/seed.ts` 와 **같은 규칙**으로 정한다. `.env` 에 `SEED_*_PASSWORD`
 * 가 있으면 seed 가 그 값을 쓰므로, 여기서 코드 기본값만 보면 개발자 `.env` 가 있는
 * 환경에서 모든 로그인 흐름이 깨진다. 빈 문자열은 "값 없음"으로 본다.
 */
function seedPassword(envKey: string, label: string): string {
  return process.env[envKey]?.trim() || fixturePassword(label);
}

export const SEED_ADMIN = {
  loginId: "admin",
  password: seedPassword("SEED_ADMIN_PASSWORD", "admin-0000"),
} as const;
export const SEED_MEMBER = {
  loginId: "member01",
  password: seedPassword("SEED_MEMBER_PASSWORD", "member-0000"),
} as const;

/** 테스트마다 다른 값이 필요한 곳에 쓴다. 같은 DB를 여러 번 쓰므로 충돌을 막는다. */
export function unique(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

/**
 * 가짜 휴대폰 번호 만들기. 실제 번호를 쓰지 않는다.
 *
 * 가린 값은 뒤 4자리만 남으므로 관리자 목록에서 행을 찾을 때 뒤 4자리가 겹치면 안 된다.
 * 테스트 파일마다 모듈이 새로 올라가 카운터가 초기화되기 때문에, 파일별로 서로 다른
 * 구간(`base`)을 받아 그 안에서만 번호를 올린다.
 */
export function createPhoneFactory(base: number): () => string {
  let serial = 0;
  return () => {
    serial += 1;
    const tail = String(base + serial)
      .padStart(4, "0")
      .slice(-4);
    const mid = String(1000 + Math.floor(Math.random() * 9000));
    return `010-${mid}-${tail}`;
  };
}

export async function submitUntilSettled(
  page: Page,
  buttonName: string | RegExp,
  settled: () => Promise<boolean>,
): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const button = page.getByRole("button", { name: buttonName });
    if ((await button.count()) > 0) await button.first().click();
    for (let waited = 0; waited < 20; waited += 1) {
      if (await settled()) return;
      await page.waitForTimeout(250);
    }
  }
  throw new Error(
    `${String(buttonName)} 를 눌러도 제출이 끝나지 않았습니다: ${page.url()}`,
  );
}

/** 제출 뒤 주소가 바뀌는 폼(로그인 등)에 쓴다. */
export async function submitUntilNavigated(
  page: Page,
  buttonName: string | RegExp,
  expectedUrl: RegExp,
): Promise<void> {
  await submitUntilSettled(page, buttonName, async () =>
    expectedUrl.test(new URL(page.url()).pathname),
  );
}

/** 제출 뒤 주소는 그대로이고 안내 문구만 바뀌는 폼에 쓴다. */
export async function submitUntilTextVisible(
  page: Page,
  buttonName: string | RegExp,
  text: string | RegExp,
): Promise<void> {
  await submitUntilSettled(page, buttonName, async () =>
    page
      .getByText(text)
      .isVisible()
      .catch(() => false),
  );
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("관리자 아이디").fill(SEED_ADMIN.loginId);
  await page.locator('input[name="password"]').fill(SEED_ADMIN.password);
  await submitUntilNavigated(page, "관리자 로그인", /^\/admin(?!\/login)/);
  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
}

export type OutboxMail = { sentAt: string; to: string; subject: string; text: string };

/** file 메일 어댑터가 남긴 줄 중 수신자가 맞는 마지막 메일을 돌려준다. */
export async function waitForMail(to: string, timeoutMs = 15_000): Promise<OutboxMail> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const raw = await readFile(MAIL_OUTBOX_FILE, "utf8");
      const mails = raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as OutboxMail)
        .filter((mail) => mail.to === to);
      if (mails.length > 0) return mails[mails.length - 1];
      lastError = `수신자 ${to} 메일 없음`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`메일을 기다리다 시간이 지났습니다: ${lastError}`);
}

/**
 * 라디오 입력이 `sr-only` 로 숨어 있고 보이는 라벨이 클릭 대상이다.
 * 사용자가 실제로 누르는 라벨을 클릭하고, 입력이 실제로 선택됐는지 확인한다.
 */
export async function pickRadio(scope: Locator, label: string): Promise<void> {
  await scope.locator(`label:text-is("${label}")`).click();
  await expect(scope.getByRole("radio", { name: label, exact: true })).toBeChecked();
}

/** FM-001 강좌 신청을 한 건 제출한다. 입력값은 전부 가짜다. */
export async function submitCourseApplication(
  page: Page,
  input: { studentName: string; phone: string; schoolName?: string; grade?: string },
): Promise<void> {
  await page.goto("/sub/schedule.n");
  await page.getByRole("button", { name: "수강예약" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("학생 이름").fill(input.studentName);
  await dialog.getByLabel("학부모 연락처").fill(input.phone);
  await dialog
    .getByLabel("재학 중인 초등학교명")
    .fill(input.schoolName ?? "가상초등학교");
  await pickRadio(dialog, "어휘·글쓰기");
  await pickRadio(dialog, input.grade ?? "초4");
  await dialog
    .getByRole("checkbox", { name: COURSE_PRIVACY_CONSENT.checkboxLabel })
    .check();
  await dialog
    .getByRole("button", { name: COURSE_PRIVACY_CONSENT.submitLabel })
    .click();

  await expect(dialog.getByText("수강 예약 신청이 접수되었습니다.")).toBeVisible({
    timeout: 20_000,
  });
  await dialog.getByRole("button", { name: "닫기" }).click();
}

import { expect, test } from "@playwright/test";
import {
  createPhoneFactory,
  loginAsAdmin,
  submitUntilSettled,
  unique,
} from "./helpers";

/**
 * Phase 5 추가 기능의 화면 흐름 — 기능마다 한 건씩.
 * - AD-009 진단 신청 버튼이 관리자가 등록한 구글 폼으로 간다
 * - AD-010 홈 하단 설명회 알림 신청
 * - AD-011 `/sub/Recruit` 강사 지원서 제출과 관리자 목록
 * - AD-014 공지 작성 → 공개 목록 노출, 임시 저장 글은 숨김
 */

const phone = createPhoneFactory(7100);

/** RT-003 이 확인하는 레거시 구글 폼 주소. 테스트가 끝나면 이 값으로 되돌린다. */
const LEGACY_DIAGNOSIS_URL = "https://forms.gle/XUjFY9jVStQDKskg8";

async function setDiagnosisUrl(
  page: import("@playwright/test").Page,
  url: string,
): Promise<void> {
  await page.goto("/admin/settings");
  await page.locator('input[name="diagnosisCtaExternalUrl"]').fill(url);
  await submitUntilSettled(
    page,
    "설정 저장",
    async () => (await page.getByText("저장했습니다.").count()) > 0,
  );
}

test.describe("AD-009 문해력 진단 신청 버튼", () => {
  test("AD-009 진단 안내 화면의 신청 버튼은 바깥 구글 폼으로 간다", async ({
    page,
  }) => {
    await page.goto("/sub/abouttch3");

    const cta = page.getByRole("link", { name: "문해력 진단 신청" }).first();
    await expect(cta).toBeVisible();

    const href = await cta.getAttribute("href");
    expect(href).toMatch(/^https:\/\//);
    await expect(cta).toHaveAttribute("target", "_blank");
    await expect(cta).toHaveAttribute("rel", /noopener/);

    // 사이트 안에 신청 폼을 두지 않는다. (사용자 결정 2026-11-12)
    await expect(page.getByLabel("학부모 성함")).toHaveCount(0);
  });

  test("AD-009 관리자가 바꾼 주소가 공개 화면에 반영된다", async ({ page }) => {
    const newUrl = `https://forms.gle/${unique("e2e")}`;

    await loginAsAdmin(page);
    await setDiagnosisUrl(page, newUrl);

    await page.goto("/sub/abouttch3");
    await expect(
      page.getByRole("link", { name: "문해력 진단 신청" }).first(),
    ).toHaveAttribute("href", newUrl);

    // 다른 테스트(RT-003)와 기준 이미지에 영향을 주지 않도록 레거시 주소로 되돌린다.
    await setDiagnosisUrl(page, LEGACY_DIAGNOSIS_URL);
  });
});

test.describe("AD-010 설명회 알림 신청", () => {
  test("AD-010 홈 하단에서 알림 신청을 하면 관리자 목록에 뜬다", async ({ page }) => {
    const guardianPhone = phone();
    const tail = guardianPhone.slice(-4);

    await page.goto("/");
    const section = page.locator("form", { hasText: "설명회 알림 신청하기" });
    await expect(section).toBeVisible();

    await section.locator('select[name="grade"]').selectOption("초3");
    await section.locator('input[name="studentName"]').fill("가상학생");
    await section.locator('input[name="schoolName"]').fill("가상초등학교");
    await section.locator('input[name="guardianPhone"]').fill(guardianPhone);
    await section.locator('input[name="privacyConsent"]').check();
    await section.locator('input[name="notifyConsent"]').check();

    await submitUntilSettled(
      page,
      "설명회 알림 신청하기",
      async () => (await page.getByText("알림 신청이 접수되었습니다").count()) > 0,
    );

    await loginAsAdmin(page);
    await page.goto("/admin/sms-subscriptions");
    await expect(page.getByText(tail, { exact: false }).first()).toBeVisible();
  });

  test("AD-010 동의를 체크하지 않으면 제출되지 않는다", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("form", { hasText: "설명회 알림 신청하기" });

    await section.locator('select[name="grade"]').selectOption("초3");
    await section.locator('input[name="studentName"]').fill("가상학생");
    await section.locator('input[name="schoolName"]').fill("가상초등학교");
    await section.locator('input[name="guardianPhone"]').fill(phone());

    await page.getByRole("button", { name: "설명회 알림 신청하기" }).click();

    await expect(page.getByText("알림 신청이 접수되었습니다")).toHaveCount(0);
    await expect(
      page.getByText("동의해야 신청할 수 있습니다", { exact: false }).first(),
    ).toBeVisible();
  });
});

test.describe("AD-011 강사 지원", () => {
  test("AD-011 지원서를 내면 관리자 목록에서 보인다", async ({ page }) => {
    const applicantPhone = phone();
    const tail = applicantPhone.slice(-4);

    await page.goto("/sub/Recruit");
    await expect(
      page.getByRole("heading", { name: "문사유 아카데미 강사 지원" }),
    ).toBeVisible();

    await page.locator('input[name="name"]').fill("가상강사");
    await page.locator('input[name="phone"]').fill(applicantPhone);
    await page.locator('input[name="email"]').fill("instructor@example.test");
    await page.locator('input[name="education"]').fill("가상대학교 국어교육과");
    await page
      .locator('select[name="experienceYears"]')
      .selectOption("3년 이상 ~ 5년 미만");
    // 선택지 입력은 `sr-only` 라서 사용자가 누르는 것은 라벨이다. 라벨을 누른다.
    await page.getByText("인문 논술 (언어/사회)").click();
    await page.getByText("실시간 현장 대면 첨삭").click();
    await page.locator('input[name="headline"]').fill("읽기에서 쓰기로 잇습니다");
    await page.locator('textarea[name="careerDetail"]').fill("가상 학원 4년");
    await page.locator('textarea[name="coachingDetail"]').fill("문단 단위 첨삭");
    await page.locator('input[name="privacyConsent"]').check();

    await page.locator('input[name="resume"]').setInputFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7\n가상 이력서\n", "utf8"),
    });

    await submitUntilSettled(
      page,
      /강사 지원서 제출하기/,
      async () => (await page.getByText("지원서가 접수되었습니다").count()) > 0,
    );

    await loginAsAdmin(page);
    await page.goto("/admin/instructor-applications");
    await expect(page.getByText(tail, { exact: false }).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "이력서 내려받기" }).first(),
    ).toBeVisible();
  });

  test("AD-011 허용되지 않은 형식은 받지 않는다", async ({ page }) => {
    await page.goto("/sub/Recruit");

    await page.locator('input[name="name"]').fill("가상강사");
    await page.locator('input[name="phone"]').fill(phone());
    await page.locator('input[name="email"]').fill("instructor@example.test");
    await page.locator('input[name="education"]').fill("가상대학교 국어교육과");
    await page
      .locator('select[name="experienceYears"]')
      .selectOption("3년 이상 ~ 5년 미만");
    // 선택지 입력은 `sr-only` 라서 사용자가 누르는 것은 라벨이다. 라벨을 누른다.
    await page.getByText("인문 논술 (언어/사회)").click();
    await page.getByText("실시간 현장 대면 첨삭").click();
    await page.locator('input[name="headline"]').fill("한 줄 소개");
    await page.locator('textarea[name="careerDetail"]').fill("가상 경력");
    await page.locator('textarea[name="coachingDetail"]').fill("가상 노하우");
    await page.locator('input[name="privacyConsent"]').check();

    // 이름은 PDF 지만 내용이 PDF 가 아니다. 서버가 내용으로 걸러야 한다. // ASM-085
    await page.locator('input[name="resume"]').setInputFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("<html><script>alert(1)</script></html>", "utf8"),
    });

    await page.getByRole("button", { name: /강사 지원서 제출하기/ }).click();

    await expect(page.getByText("지원서가 접수되었습니다")).toHaveCount(0);
    await expect(
      page.getByText("형식만 올릴 수 있습니다", { exact: false }).first(),
    ).toBeVisible();
  });
});

test.describe("AD-014 공지사항", () => {
  test("AD-014 공지를 쓰면 공개 목록에 나오고 임시 저장 글은 숨는다", async ({
    page,
  }) => {
    const publishedTitle = unique("게시공지-");
    const draftTitle = unique("임시공지-");

    await loginAsAdmin(page);

    // 게시 상태로 작성
    await page.goto("/admin/notices");
    const createPanel = page.locator("section", { hasText: "새 공지 작성" });
    await createPanel.locator('input[name="title"]').fill(publishedTitle);
    await createPanel.locator('[role="textbox"]').fill("본문입니다.");
    await createPanel.locator('select[name="status"]').selectOption("PUBLISHED");
    await submitUntilSettled(
      page,
      "공지 등록",
      async () => (await page.getByText("저장했습니다.").count()) > 0,
    );

    // 임시 저장으로 작성
    await page.goto("/admin/notices");
    const draftPanel = page.locator("section", { hasText: "새 공지 작성" });
    await draftPanel.locator('input[name="title"]').fill(draftTitle);
    await draftPanel.locator('[role="textbox"]').fill("아직 공개하지 않습니다.");
    await draftPanel.locator('select[name="status"]').selectOption("DRAFT");
    await submitUntilSettled(
      page,
      "공지 등록",
      async () => (await page.getByText("저장했습니다.").count()) > 0,
    );

    await page.goto("/notice");
    await expect(page.getByRole("link", { name: publishedTitle })).toBeVisible();
    await expect(page.getByRole("link", { name: draftTitle })).toHaveCount(0);

    await page.getByRole("link", { name: publishedTitle }).click();
    await expect(page.getByRole("heading", { name: publishedTitle })).toBeVisible();
    await expect(page.getByText("본문입니다.")).toBeVisible();
  });
});

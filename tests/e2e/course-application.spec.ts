import { expect, test } from "@playwright/test";
import { maskName, maskPhone } from "../../src/lib/contracts";
import {
  createPhoneFactory,
  loginAsAdmin,
  submitCourseApplication,
  unique,
} from "./helpers";

/**
 * C-3 통합 흐름 1 — FM-001 신청 → DB 저장 → AD-008 관리자 조회 → BZ-001 마감 전환 → 신청 차단.
 * 개인정보는 전부 가짜 값이다.
 */
/** 이 파일 전용 번호 구간. 다른 파일과 뒤 4자리가 겹치지 않게 한다. */
const fakePhone = createPhoneFactory(1000);

test.describe("FM-001 강좌 신청 전체 흐름", () => {
  test("FM-001/AD-008 신청하면 저장되고 관리자 목록에는 가린 값으로만 보인다", async ({
    page,
  }) => {
    const studentName = unique("가상학생");
    const phone = fakePhone();

    await submitCourseApplication(page, { studentName, phone });

    await loginAsAdmin(page);
    await page.goto("/admin/applications");

    // 가린 이름은 길이만 남아 서로 겹칠 수 있어 가린 연락처로 행을 찾는다.
    const row = page.getByRole("row").filter({ hasText: maskPhone(phone) });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText(maskName(studentName));

    // AD-013: 목록에는 원문 이름·연락처가 없어야 한다.
    const body = (await page.locator("main").textContent()) ?? "";
    expect(body).not.toContain(studentName);
    expect(body).not.toContain(phone);
  });

  test("FM-001 같은 연락처로 다시 신청할 수 있다 (중복 차단 없음, ASM-001)", async ({
    page,
  }) => {
    const studentName = unique("가상재신청");
    const phone = fakePhone();

    await submitCourseApplication(page, { studentName, phone });
    await submitCourseApplication(page, { studentName, phone });

    await loginAsAdmin(page);
    await page.goto("/admin/applications");
    await expect(
      page.getByRole("row").filter({ hasText: maskPhone(phone) }),
    ).toHaveCount(2, { timeout: 20_000 });
  });

  test("BZ-001 관리자가 접수마감으로 바꾸면 공개 화면에서 신청할 수 없다", async ({
    page,
  }) => {
    const courseTitle = "6학년 문해력 진단평가 1회";

    await loginAsAdmin(page);
    await page.goto("/admin/courses");

    // 한 행에 빠른 전환 폼과 수정 폼이 각각 접수 상태 선택을 갖고 있어 전환 폼으로 범위를 좁힌다.
    const intakeForm = (title: string) =>
      page
        .getByRole("row")
        .filter({ hasText: title })
        .locator("form")
        .filter({ has: page.getByRole("button", { name: "변경" }) });

    await intakeForm(courseTitle).getByLabel("접수 상태").selectOption("접수마감");
    await intakeForm(courseTitle).getByRole("button", { name: "변경" }).click();
    await expect(intakeForm(courseTitle).getByLabel("접수 상태")).toHaveValue("false", {
      timeout: 20_000,
    });

    // 공개 화면: 마감된 강좌 카드에는 수강예약 버튼이 없고 비활성 접수마감 버튼이 있다.
    await page.goto("/sub/schedule.n");
    const card = page.getByRole("listitem").filter({ hasText: courseTitle });
    await expect(card.getByRole("button", { name: "접수마감" })).toBeDisabled();
    await expect(card.getByRole("button", { name: "수강예약" })).toHaveCount(0);

    // 뒤에 오는 테스트를 위해 접수중으로 되돌린다.
    await page.goto("/admin/courses");
    await intakeForm(courseTitle).getByLabel("접수 상태").selectOption("접수중");
    await intakeForm(courseTitle).getByRole("button", { name: "변경" }).click();
    await expect(intakeForm(courseTitle).getByLabel("접수 상태")).toHaveValue("true", {
      timeout: 20_000,
    });
  });
});

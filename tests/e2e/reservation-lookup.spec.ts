import { expect, type Page, test } from "@playwright/test";
import { createPhoneFactory, submitCourseApplication, unique } from "./helpers";

/**
 * C-3 통합 흐름 2 — PG-011 예약 조회·취소.
 * 같은 연락처로 여러 건을 신청할 수 있으므로 조회는 목록이고 취소는 건별이다. (ASM-001, ASM-013)
 */

/** 페이지 아래 주의사항 목록과 섞이지 않게 조회 결과 영역으로 범위를 좁힌다. */
function resultSection(page: Page) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "조회 결과" }) });
}

async function lookup(page: Page, name: string, phone: string): Promise<void> {
  await page.goto("/sub/Check");
  await page.getByLabel("학생 이름").fill(name);
  await page.getByLabel("학부모 휴대폰 번호").fill(phone);
  await page.getByRole("button", { name: "예약 내역 조회하기" }).click();
  await expect(page.getByRole("heading", { name: "조회 결과" })).toBeVisible({
    timeout: 20_000,
  });
}

/** 이 파일 전용 번호 구간. 다른 파일과 뒤 4자리가 겹치지 않게 한다. */
const fakePhone = createPhoneFactory(3000);

test.describe("PG-011 예약 조회·취소", () => {
  test("PG-011 한 연락처의 여러 건이 목록으로 나오고 건별로 취소된다", async ({
    page,
  }) => {
    const studentName = unique("가상조회");
    const phone = fakePhone();

    await submitCourseApplication(page, { studentName, phone, grade: "초3" });
    await submitCourseApplication(page, { studentName, phone, grade: "초5" });

    await lookup(page, studentName, phone);

    const items = resultSection(page).getByRole("listitem");
    await expect(items).toHaveCount(2);

    // 한 건만 취소한다.
    await items.first().getByRole("button", { name: "예약 취소" }).click();
    await expect(
      page.getByRole("heading", { name: "예약을 취소하시겠습니까?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "예약 취소하기" }).click();

    await expect(page.getByText("예약을 취소했습니다.")).toBeVisible({
      timeout: 20_000,
    });
    // 목록은 그대로 2건이고, 취소한 건만 상태가 바뀌고 취소 버튼이 사라진다.
    await expect(resultSection(page).getByRole("listitem")).toHaveCount(2);
    await expect(
      resultSection(page).getByRole("button", { name: "예약 취소" }),
    ).toHaveCount(1);
    await expect(resultSection(page).getByText("취소됨")).toHaveCount(1);
  });

  test("PG-011 이름·연락처가 맞지 않으면 다른 사람의 예약이 보이지 않는다", async ({
    page,
  }) => {
    const studentName = unique("가상타인");
    const phone = fakePhone();
    await submitCourseApplication(page, { studentName, phone });

    await lookup(page, studentName, fakePhone());

    await expect(resultSection(page).getByRole("listitem")).toHaveCount(0);
    await expect(
      page.getByText("확인할 수 있는 예약 내역이 없습니다", { exact: false }),
    ).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";
import { PUBLIC_PAGES, waitForPage } from "./public-pages";

/**
 * Phase 3 Gate — 반응형·접근성 기본 점검을 눈으로 보는 대신 단언으로 굳힌다.
 *
 * 1440 / 390 두 폭에서 모두 돌아간다. 390 에서 가로 스크롤이 생기면 실패한다.
 */
test.describe("공개 화면 반응형·접근성 기본 점검", () => {
  for (const testCase of PUBLIC_PAGES) {
    test(`${testCase.featureId} ${testCase.name}: 가로 스크롤이 없고 제목·레이블이 갖춰져 있다`, async ({
      page,
    }) => {
      await waitForPage(page, testCase);

      // 1) 본문이 뷰포트보다 넓어지지 않는다. 표·코드 영역은 자기 안에서만 스크롤한다.
      const overflow = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);

      // 2) h1 이 정확히 하나다.
      await expect(page.locator("h1")).toHaveCount(1);

      // 3) 모든 폼 컨트롤에 접근 가능한 이름이 있다.
      const unlabelled = await page.evaluate(() => {
        const controls = Array.from(
          document.querySelectorAll<HTMLElement>("input, select, textarea"),
        ).filter((control) => control.getAttribute("type") !== "hidden");

        return controls.filter((control) => {
          if (control.getAttribute("aria-label")) return false;
          if (control.getAttribute("aria-labelledby")) return false;
          if (control.closest("label")) return false;
          const { id } = control;
          if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) {
            return false;
          }
          return true;
        }).length;
      });
      expect(unlabelled).toBe(0);
    });
  }
});

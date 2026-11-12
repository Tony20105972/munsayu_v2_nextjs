import { expect, test } from "@playwright/test";
import { PUBLIC_PAGES, waitForPage } from "./public-pages";

/**
 * Phase 3 Gate — 공개 화면 시각 회귀 (1440 / 390).
 *
 * `playwright.config.ts` 의 `visual-1440` / `visual-390` 두 프로젝트에서 같은 테스트가
 * 각각 실행되고 스냅샷 파일 이름에 프로젝트 이름이 붙는다.
 * 기준 이미지를 새로 만들 때: `npm run e2e:visual -- --update-snapshots`
 */
test.describe("공개 화면 시각 회귀", () => {
  for (const testCase of PUBLIC_PAGES) {
    test(`${testCase.featureId} ${testCase.name}: 화면이 기준 이미지와 같다`, async ({
      page,
    }) => {
      await waitForPage(page, testCase);

      await expect(page).toHaveScreenshot({
        fullPage: true,
        animations: "disabled",
        // Playwright 기본값인 `caret: "hide"` 는 입력란에 인라인 style 을 심어
        // React hydration 경고를 만든다. 공개 화면에는 자동 포커스가 없어 깜빡이는
        // 커서가 없으므로 기본 상태 그대로 찍는다.
        caret: "initial",
        maxDiffPixelRatio: 0.002,
      });
    });
  }
});

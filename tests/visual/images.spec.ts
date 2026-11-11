import { expect, test } from "@playwright/test";
import { hideDevOverlay, PUBLIC_PAGES, waitForPage } from "./public-pages";

/**
 * 공개 화면의 이미지가 실제로 뜨는지 확인한다. (EV-0012 이미지 반영 검증)
 *
 * - `<img>`: 모든 이미지의 `naturalWidth > 0`. 0이면 파일이 없거나 주소가 틀린 것이다.
 * - CSS background: `background-image` 가 `none` 이 아니어야 한다.
 * - 1440 / 390 두 폭에서 모두 돌아간다. `next/image` 는 폭에 따라 다른 파일을 요청한다.
 * - 외부 호스트를 가리키는 이미지가 없는지도 함께 확인한다. (운영 사이트 직링크 금지)
 */
test.describe("공개 화면 이미지", () => {
  for (const testCase of PUBLIC_PAGES) {
    test(`${testCase.featureId} ${testCase.name}: 깨진 이미지가 없다`, async ({
      page,
    }) => {
      await waitForPage(page, testCase);

      // next/image 는 화면에 들어올 때 불러오므로 끝까지 내려 모두 불러오게 한다.
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let top = 0; top < document.body.scrollHeight; top += step) {
          window.scrollTo(0, top);
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
        window.scrollTo(0, 0);
      });

      // 모든 이미지가 끝까지(성공이든 실패든) 처리될 때까지 기다린다.
      // `complete` 는 실패했을 때도 true 가 되므로 아래 `naturalWidth` 검사가 의미를 갖는다.
      await page.waitForFunction(
        () => Array.from(document.images).every((image) => image.complete),
        undefined,
        { timeout: 30_000 },
      );

      const report = await page.evaluate(() => {
        const images = Array.from(document.images);
        const broken = images
          .filter((image) => image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src);

        const external = images
          .map((image) => image.currentSrc || image.src)
          .filter((src) => src.startsWith("http") && !src.includes("127.0.0.1"));

        const backgrounds = Array.from(
          document.querySelectorAll<HTMLElement>("[style*='background-image']"),
        ).map((element) => window.getComputedStyle(element).backgroundImage);

        return {
          total: images.length,
          broken,
          external,
          backgrounds,
          emptyBackgrounds: backgrounds.filter((value) => value === "none").length,
        };
      });

      expect(report.broken, `깨진 이미지: ${report.broken.join(", ")}`).toEqual([]);
      expect(
        report.external,
        `외부 호스트 이미지: ${report.external.join(", ")}`,
      ).toEqual([]);
      expect(report.emptyBackgrounds).toBe(0);

      // 모든 공개 화면에는 적어도 로고 1장과 상단 배경 1개가 있다.
      expect(report.total).toBeGreaterThan(0);
      expect(report.backgrounds.length).toBeGreaterThan(0);
    });
  }

  /**
   * 시설안내는 지점 탭을 눌러야 분당점 사진이 DOM 에 들어온다.
   * 탭을 바꾼 뒤에도 깨진 이미지가 없는지 따로 확인한다.
   */
  test("PG-004 시설안내: 분당점 탭에서도 깨진 이미지가 없다", async ({ page }) => {
    await page.goto("/sub/Facility", { waitUntil: "domcontentloaded" });
    await hideDevOverlay(page);
    // 대치본원 패널이 그려진 뒤(= 하이드레이션 완료 뒤)에 탭을 누른다.
    await page.getByText("절제된 색감과 따뜻한 소재").first().waitFor({
      state: "visible",
      timeout: 15_000,
    });
    await page.getByRole("tab", { name: "분당점" }).click();
    await page.getByText("책과 가까워지는 북카페").first().waitFor({
      state: "visible",
      timeout: 15_000,
    });

    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let top = 0; top < document.body.scrollHeight; top += step) {
        window.scrollTo(0, top);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      window.scrollTo(0, 0);
    });

    await page.waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      undefined,
      { timeout: 30_000 },
    );

    const broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((image) => image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
    );

    expect(broken, `깨진 이미지: ${broken.join(", ")}`).toEqual([]);
  });
});

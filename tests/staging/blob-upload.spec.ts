import { expect, test } from "@playwright/test";

/**
 * 스테이징·운영에서 **사진 한 장을 실제로 올려 보는** 점검. (Gate 2 마지막 항목, AD-015)
 *
 * **이 점검은 자료를 만든다.** 보관함에 사진 한 장이 남고 Blob 저장소에 파일이 하나
 * 올라간다. 같은 폴더의 `smoke.spec.ts` 는 아무것도 만들지 않지만 이것은 다르다.
 * 그래서 **환경 변수를 넣을 때만** 돈다. 넣지 않으면 조용히 건너뛴다.
 *
 *   STAGING_BASE_URL=https://<주소> \
 *   VERCEL_AUTOMATION_BYPASS_SECRET=<보호 우회 열쇠> \
 *   STAGING_ADMIN_ID=<관리자 아이디> STAGING_ADMIN_PASSWORD=<비밀번호> \
 *   STAGING_UPLOAD_IMAGE=<올릴 사진 경로> \
 *     npx playwright test --project=staging blob-upload
 *
 * 왜 이 점검이 필요한가 — 단위 테스트로는 **저장소가 실제로 받아 주는지** 알 수 없다.
 * 이 경로를 처음 실제 저장소에 돌려 결함 셋을 찾았다 (OBSERVED 2026-11-15, EV-0019):
 * CSP `connect-src` 가 서명된 PUT 주소를 막았고, 공개 사진이 private 저장소로 가서
 * 거부됐고, 보호 우회를 **헤더**로 붙이면 저장소로 가는 교차 출처 요청이 CORS 에서
 * 막혔다.
 *
 * **보호를 쿠키로 지나간다.** 묶음 설정의 `extraHTTPHeaders` 는 브라우저의 **모든**
 * 요청에 `x-vercel-protection-bypass` 를 붙이는데, 저장소로 가는 요청에 그 헤더가
 * 붙으면 preflight 의 `Access-Control-Allow-Headers` 에 없어서 막힌다. 그래서 설정을
 * 물려받지 않는 컨텍스트를 만들고, 쿼리 매개변수로 한 번 받아 둔 쿠키로 지나간다.
 */
const adminId = process.env.STAGING_ADMIN_ID ?? "";
const adminPassword = process.env.STAGING_ADMIN_PASSWORD ?? "";
const imagePath = process.env.STAGING_UPLOAD_IMAGE ?? "";
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";

test("관리자가 사진을 올리면 Vercel Blob 에 저장된다", async ({ browser, baseURL }) => {
  test.skip(
    !adminId || !adminPassword || !imagePath || !baseURL,
    "환경 변수가 없다",
  );

  // Playwright Test 는 `browser.newContext()` 에도 설정의 `use` 를 물려준다. 헤더를 비워 끈다.
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: {} });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  // 보호 우회 쿠키를 한 번 받는다.
  await page.goto(
    `/?x-vercel-protection-bypass=${bypass}&x-vercel-set-bypass-cookie=true`,
  );

  await page.goto("/admin/login");
  await page.getByLabel("관리자 아이디").fill(adminId);
  await page.locator('input[name="password"]').fill(adminPassword);
  await page.getByRole("button", { name: "관리자 로그인" }).click();
  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible({
    timeout: 30_000,
  });

  await page.goto("/admin/media");
  const uploadForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "사진 올리기" }) })
    .first();
  await uploadForm.locator('input[name="image"]').setInputFiles(imagePath);
  await uploadForm.locator('input[name="alt"]').fill("스테이징 업로드 확인용 단색 사진");
  await uploadForm.getByRole("button", { name: "사진 올리기" }).click();

  const status = uploadForm.locator('[role="status"], [role="alert"]').first();
  await expect(status).toBeVisible({ timeout: 90_000 });
  const text = (await status.textContent()) ?? "";
  console.log(`[upload] 응답 문구: ${text}`);
  console.log(`[upload] 콘솔 오류: ${JSON.stringify(consoleErrors.slice(0, 5))}`);
  expect(text).toContain("사진을 올렸습니다");

  // 보관함에 들어온 사진의 주소가 Blob 공개 호스트인지 본다.
  await page.reload();
  const blobImage = page
    .locator('img[src*="public.blob.vercel-storage.com"], img[src*="blob.vercel-storage.com"]')
    .first();
  const optimized = page.locator('img[src*="blob.vercel-storage.com"]').first();
  const src = (await blobImage.count())
    ? await blobImage.getAttribute("src")
    : await optimized.getAttribute("src");
  console.log(`[upload] 보관함 첫 사진 src: ${src}`);

  /*
   * 주소가 Blob 공개 호스트를 가리켜야 한다. `/uploads/...` 가 나오면
   * `STORAGE_ADAPTER` 가 `local` 이라는 뜻이고, 그러면 올린 사진이 배포마다 사라진다.
   */
  expect(src ?? "").toContain("public.blob.vercel-storage.com");

  await context.close();
});

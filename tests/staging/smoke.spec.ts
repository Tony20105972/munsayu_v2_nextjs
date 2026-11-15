import { expect, test } from "@playwright/test";

/**
 * Phase 7 스테이징 점검 — 세워 둔 주소를 **바깥에서** 두드려 본다.
 *
 * 돌리는 법 (로컬 개발 서버를 띄우지 않는다):
 *
 *   STAGING_BASE_URL=https://<스테이징 주소> \
 *   VERCEL_AUTOMATION_BYPASS_SECRET=<보호 우회 열쇠> \
 *     npm run e2e:staging
 *
 * 왜 따로 두는가 — `tests/e2e` 는 seed 가 넣은 가짜 데이터를 전제로 하고, 준비 단계
 * (`global-setup.ts`)가 **행을 지운다.** 그것을 스테이징에 돌리면 넣어 둔 데이터가
 * 사라진다. 그래서 여기에는 **아무것도 만들지 않고 아무것도 지우지 않는** 점검만 둔다.
 *
 * 화면을 눌러 보는 점검(신청 각 1건·관리자 상태 변경·CSV·사진 올리기·공지 작성)은
 * `docs/migration-checklist.md` 3장에 사람이 도는 순서로 있다. 그 중 자동으로 돌릴 수
 * 있는 것은 관리자 계정을 만든 뒤 기존 `e2e` 묶음을 스테이징 주소로 돌려 확인한다
 * (메일 파일을 읽는 비밀번호 재설정 흐름은 제외).
 */

/** PG-001~014 공개 화면. 공지 상세는 글이 있어야 하므로 여기 넣지 않는다. */
const PUBLIC_PATHS = [
  "/",
  "/sub/about",
  "/sub/Location",
  "/sub/Facility",
  "/sub/abouttch1",
  "/sub/abouttch2",
  "/sub/abouttch3",
  "/sub/schedule.n",
  "/sub/schedule.g",
  "/sub/Presentation",
  "/sub/Check",
  "/notice",
  "/login",
  "/register",
  "/account/recovery",
  "/account/password-reset",
] as const;

test.describe("스테이징 공개 화면", () => {
  for (const path of PUBLIC_PATHS) {
    test(`${path} 가 200 으로 열린다`, async ({ request }) => {
      const response = await request.get(path);
      /*
       * 401·403 이면 Vercel 로그인 보호를 지나지 못한 것이다.
       * `VERCEL_AUTOMATION_BYPASS_SECRET` 을 넣었는지 먼저 확인한다.
       */
      expect(
        response.status(),
        `${path} 응답이 200 이 아니다. 401·403 이면 보호 우회 열쇠를 확인한다.`,
      ).toBe(200);
    });
  }

  test("홈 화면에 보안 헤더가 붙는다", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();

    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    // 운영 빌드에서는 eval 을 열지 않는다. 열려 있으면 개발 모드로 배포된 것이다.
    expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
    expect(headers["content-security-policy"]).toContain(
      "https://*.public.blob.vercel-storage.com",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    // 어떤 틀로 만들었는지 알리지 않는다.
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("robots.txt 와 sitemap.xml 이 열리고 서로 이어진다", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const robotsBody = await robots.text();
    expect(robotsBody.toLowerCase()).toContain("sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain("<urlset");
    expect(sitemapBody).toContain("/sub/Presentation");
  });
});

test.describe("스테이징 레거시 주소 (RT-001~004)", () => {
  const redirects = [
    { from: "/bbs/board.php?bo_table=notice", to: "/notice" },
    { from: "/bbs/board.php?bo_table=notice&wr_id=1", to: "/notice/1" },
    { from: "/bbs/login.php", to: "/login" },
    { from: "/bbs/register.php", to: "/register" },
    { from: "/bbs/password_lost.php", to: "/account/recovery" },
  ] as const;

  for (const { from, to } of redirects) {
    test(`${from} → 308 ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(new URL(response.headers()["location"], "https://x.test").pathname).toBe(
        to,
      );
    });
  }

  for (const path of ["/uAdmin", "/adm"] as const) {
    test(`${path} 는 410 이고 관리자 주소를 드러내지 않는다`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(410);
      // 응답에 `/admin` 이 있다는 사실을 알려 주지 않는다. (RT-004)
      expect(await response.text()).not.toContain("/admin");
      expect(response.headers()["x-robots-tag"]).toContain("noindex");
    });

    /*
     * 레거시 robots.txt 에 적혀 있던 모양은 **끝에 `/` 가 붙은** `/uAdmin/` 이다(EV-0002).
     * 그 주소로 오면 Next 가 끝의 `/` 를 떼는 308 을 한 번 보내고, 그다음이 410 이다.
     * 중간에 308 이 한 번 끼는 것은 괜찮지만 **마지막이 410 인 것**은 지켜야 한다.
     */
    test(`${path}/ 도 따라가면 410 으로 끝난다`, async ({ request }) => {
      const response = await request.get(`${path}/`);
      expect(response.status()).toBe(410);
      expect(await response.text()).not.toContain("/admin");
    });
  }
});

test.describe("스테이징 관리자 경로", () => {
  test("관리자 로그인 화면이 열린다", async ({ request }) => {
    const response = await request.get("/admin/login");
    expect(response.status()).toBe(200);
  });

  test("로그인하지 않으면 관리자 자료를 주지 않는다", async ({ request }) => {
    // 세션이 없으면 401 이어야 한다. 200 이면 개인정보가 그냥 나간다는 뜻이다.
    for (const path of [
      "/api/admin/applications",
      "/api/admin/consultations",
      "/api/admin/instructor-applications",
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect([401, 403], `${path} 가 ${response.status()} 로 답했다`).toContain(
        response.status(),
      );
    }
  });

  test("파기 예약 경로는 비밀값 없이 통과하지 못한다", async ({ request }) => {
    // 경로의 존재를 드러내지 않으려고 404 로 답한다. (ASM-100)
    const response = await request.get("/api/cron/privacy-purge", { maxRedirects: 0 });
    expect(response.status()).toBe(404);

    const wrong = await request.get("/api/cron/privacy-purge", {
      headers: { authorization: "Bearer wrong-value" },
      maxRedirects: 0,
    });
    expect(wrong.status()).toBe(404);
  });
});

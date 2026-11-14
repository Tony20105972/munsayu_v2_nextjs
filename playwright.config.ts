// seed 와 같은 `.env` 를 읽는다. 로그인 비밀번호(`SEED_*_PASSWORD`)를 테스트도 알아야 한다.
import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

/** E2E 가 보낸 메일을 읽는 파일. 테스트와 dev 서버가 같은 경로를 본다. */
export const MAIL_OUTBOX_FILE = join(process.cwd(), ".tmp", "e2e-mail-outbox.jsonl");

/**
 * e2e: 기능 흐름 테스트 (CI에서 실행).
 * visual-1440 / visual-390: 저장된 레거시 스크린샷 기준 시각 회귀. (Phase 3 Gate)
 * 운영 사이트(munsayu.com)에는 접속하지 않는다.
 */
export default defineConfig({
  globalSetup: "./tests/e2e/global-setup.ts",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  projects: [
    {
      name: "e2e",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "visual-1440",
      testDir: "./tests/visual",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "visual-390",
      testDir: "./tests/visual",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: false,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // 비밀번호 재설정 링크를 테스트가 읽어야 해서 메일을 파일로 떨어뜨린다. 실제 발송은 없다.
      MAIL_ADAPTER: "file",
      MAIL_OUTBOX_FILE: MAIL_OUTBOX_FILE,
    },
  },
});

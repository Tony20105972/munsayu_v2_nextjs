// seed 와 같은 `.env` 를 읽는다. 로그인 비밀번호(`SEED_*_PASSWORD`)를 테스트도 알아야 한다.
import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

/** E2E 가 보낸 메일을 읽는 파일. 테스트와 dev 서버가 같은 경로를 본다. */
export const MAIL_OUTBOX_FILE = join(process.cwd(), ".tmp", "e2e-mail-outbox.jsonl");

/**
 * `STAGING_BASE_URL` 이 있으면 **스테이징 점검 모드**로 바뀐다. (Phase 7)
 *
 * 이 모드에서는 로컬 개발 서버를 띄우지 않고, `globalSetup` 도 돌리지 않는다.
 * `globalSetup` 은 **행을 지운다.** 스테이징 주소를 가리킨 채 그것이 돌면 스테이징에
 * 넣어 둔 기본 데이터·공지·관리자 계정이 사라진다. 그래서 모드를 아예 갈라 둔다.
 */
const stagingBaseURL = process.env.STAGING_BASE_URL?.trim() || undefined;

/**
 * Vercel 의 로그인 보호(Deployment Protection)를 지나가는 열쇠.
 * 없으면 모든 요청이 Vercel 로그인 화면으로 가서 점검이 전부 실패한다.
 * (Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation)
 */
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() || undefined;

const stagingHeaders = bypassSecret
  ? {
      "x-vercel-protection-bypass": bypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    }
  : undefined;

/**
 * e2e: 기능 흐름 테스트 (CI에서 실행).
 * visual-1440 / visual-390: 저장된 레거시 스크린샷 기준 시각 회귀. (Phase 3 Gate)
 * staging: 세워 둔 스테이징 주소를 바깥에서 두드려 보는 점검. (Phase 7)
 * 운영 사이트(munsayu.com)에는 접속하지 않는다.
 */
export default defineConfig({
  // 스테이징 모드에서는 DB 를 비우는 준비 단계를 돌리지 않는다.
  ...(stagingBaseURL ? {} : { globalSetup: "./tests/e2e/global-setup.ts" }),
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: stagingBaseURL ?? "http://127.0.0.1:3000",
    /*
     * 스테이징 모드에서는 추적을 **끈다.** 추적 파일은 요청 헤더를 그대로 담는데,
     * 그 헤더에 보호 우회 열쇠(`x-vercel-protection-bypass`)가 들어 있다.
     * `CI=1` 로 돌리면 재시도가 생겨 추적이 남으므로, 비밀값이 파일로 떨어질 수 있다.
     */
    trace: stagingBaseURL ? "off" : "on-first-retry",
    ...(stagingHeaders ? { extraHTTPHeaders: stagingHeaders } : {}),
  },
  /*
   * 스테이징 모드에서는 **`staging` 묶음 하나만** 둔다.
   *
   * 묶음을 남겨 두면 `STAGING_BASE_URL=... --project=e2e` 같은 실행이 가능해진다.
   * 그 묶음은 seed 가 넣은 가짜 데이터를 전제로 하고, 회원·신청을 만들고 사이트 설정을
   * 바꾼다. 스테이징을 가리킨 채 돌면 세워 둔 데이터가 흐트러진다. 준비 단계를 건너뛰는
   * 것만으로는 부족해서, 고를 수 있는 묶음 자체를 없앤다.
   * (없는 묶음을 지정하면 Playwright 가 바로 「찾을 수 없다」고 멈춘다)
   */
  projects: stagingBaseURL
    ? [
        {
          name: "staging",
          testDir: "./tests/staging",
          use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
        },
      ]
    : [
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
  // 스테이징 모드에서는 로컬 서버를 띄우지 않는다. 바깥 주소를 그대로 두드린다.
  ...(stagingBaseURL
    ? {}
    : {
        webServer: {
          command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
          url: "http://127.0.0.1:3000",
          /*
           * **이미 떠 있는 서버를 쓰지 않는다.**
           *
           * 아래 `env` 는 Playwright 가 직접 띄운 서버에만 붙는다. `npm run dev` 로 미리
           * 띄워 둔 서버를 재사용하면 `MAIL_ADAPTER=file` 이 빠진 채로 돌아서, 비밀번호
           * 재설정 흐름이 메일 파일을 찾지 못해 `ENOENT` 로 깨진다. 원인이 드러나지 않는
           * 실패라 찾는 데 오래 걸린다. 매번 새로 띄워 설정이 항상 맞게 한다.
           * 포트가 이미 쓰이면 Playwright 가 그 사실을 바로 알려 준다.
           */
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            // 비밀번호 재설정 링크를 테스트가 읽어야 해서 메일을 파일로 떨어뜨린다. 실제 발송은 없다.
            MAIL_ADAPTER: "file",
            MAIL_OUTBOX_FILE: MAIL_OUTBOX_FILE,
          },
        },
      }),
});

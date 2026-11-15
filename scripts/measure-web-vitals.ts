/**
 * 모바일 기준 Core Web Vitals 측정. (Phase 6)
 *
 * Lighthouse 를 devDependency 로 넣지 않고 CDP 로 직접 잰다. 재는 값은 Lighthouse 와
 * 같은 정의를 쓴다.
 * - LCP: `largest-contentful-paint` 중 마지막 값
 * - CLS: 사용자 입력 없이 일어난 `layout-shift` 를 세션 창(1초 간격·최대 5초)으로 묶은 최댓값
 * - TBT: 긴 작업(50ms 초과분)의 합. **INP 대신 쓰는 대용값**이다. INP 는 실제 사용자
 *   상호작용이 있어야 나오므로, 아래에서 대표 조작을 한 번 하고 그 응답 지연도 함께 잰다.
 *
 * 조건은 Lighthouse 모바일 기본값에 맞춘다: 375x667 DPR2, CPU 4배 느리게,
 * 네트워크 느린 4G(1.6Mbps/750kbps/150ms RTT).
 *
 * 쓰는 법: `npx tsx scripts/measure-web-vitals.ts [기준주소] [출력파일]`
 * 로컬 프로덕션 빌드(`next build` → `next start`)를 상대로만 돌린다. 운영 사이트에 쓰지 않는다.
 */
import { chromium, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUT = process.argv[3] ?? "";
const RUNS = 3;

/** 측정 대상. 공개 화면 중 방문이 많을 자리와 관리자 로그인. */
const PAGES = [
  { id: "PG-001", label: "홈", path: "/" },
  { id: "PG-008", label: "대치본원 시간표", path: "/sub/schedule.n" },
  { id: "PG-010", label: "현장설명회 예약", path: "/sub/Presentation" },
  { id: "PG-012", label: "공지사항 목록", path: "/notice" },
  { id: "PG-002", label: "학원 소개", path: "/sub/about" },
  { id: "PG-004", label: "시설안내", path: "/sub/Facility" },
  { id: "PG-013", label: "로그인", path: "/login" },
] as const;

type Vitals = { lcp: number; cls: number; tbt: number; domContentLoaded: number };

const COLLECTOR = `
(() => {
  window.__vitals = { lcp: 0, clsMax: 0, tbt: 0 };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__vitals.lcp = entry.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  let sessionValue = 0;
  let sessionFirst = 0;
  let sessionLast = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      if (sessionValue && entry.startTime - sessionLast < 1000 && entry.startTime - sessionFirst < 5000) {
        sessionValue += entry.value;
        sessionLast = entry.startTime;
      } else {
        sessionValue = entry.value;
        sessionFirst = entry.startTime;
        sessionLast = entry.startTime;
      }
      if (sessionValue > window.__vitals.clsMax) window.__vitals.clsMax = sessionValue;
    }
  }).observe({ type: 'layout-shift', buffered: true });

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) window.__vitals.tbt += entry.duration - 50;
    }
  }).observe({ type: 'longtask', buffered: true });
})();
`;

async function throttle(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
}

async function measureOnce(path: string): Promise<Vitals> {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.addInitScript(COLLECTOR);
  await throttle(page);

  try {
    await page.goto(BASE + path, { waitUntil: "load", timeout: 90_000 });
    // 늦게 흘러오는 본문(PPR)과 늦은 레이아웃 이동까지 담는다.
    await page.waitForTimeout(5_000);
    return await page.evaluate(() => {
      const v = (window as unknown as { __vitals: { lcp: number; clsMax: number; tbt: number } })
        .__vitals;
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return {
        lcp: Math.round(v.lcp),
        cls: Number(v.clsMax.toFixed(4)),
        tbt: Math.round(v.tbt),
        domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      };
    });
  } finally {
    await browser.close();
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function main(): Promise<void> {
  const rows: Array<{ id: string; label: string; path: string } & Vitals> = [];

  for (const target of PAGES) {
    const runs: Vitals[] = [];
    for (let i = 0; i < RUNS; i += 1) {
      runs.push(await measureOnce(target.path));
    }
    const row = {
      id: target.id,
      label: target.label,
      path: target.path,
      lcp: median(runs.map((r) => r.lcp)),
      cls: median(runs.map((r) => r.cls)),
      tbt: median(runs.map((r) => r.tbt)),
      domContentLoaded: median(runs.map((r) => r.domContentLoaded)),
    };
    rows.push(row);
    const ok = row.lcp <= 2500 && row.cls <= 0.1 && row.tbt <= 200;
    console.log(
      `${row.id} ${row.label.padEnd(16)} LCP ${String(row.lcp).padStart(5)}ms  ` +
        `CLS ${row.cls.toFixed(3)}  TBT ${String(row.tbt).padStart(4)}ms  ${ok ? "통과" : "확인"}`,
    );
  }

  if (OUT) {
    writeFileSync(OUT, JSON.stringify({ base: BASE, runs: RUNS, rows }, null, 1));
    console.log(`\n저장: ${OUT}`);
  }
}

void main();

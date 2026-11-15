/**
 * 신청 API 부하 테스트. (Phase 6)
 *
 * **로컬 프로덕션 빌드만 상대로 돌린다.** 운영 주소(munsayu.com)나 스테이징을 넣으면
 * 멈춘다. 실제 신청을 만드는 요청이라 운영에 보내면 안 된다. (CLAUDE.md 3장)
 *
 * 보내는 자료는 전부 가짜다. 이름은 `부하테스트`, 연락처는 `010-0000-xxxx` 범위를 쓴다.
 * 끝나면 만든 행을 지우지 않는다 — 어떤 상태로 남았는지 직접 보기 위해서다.
 * 정리는 `npm run db:seed` 또는 `npm run db:reset` 으로 한다.
 *
 * 쓰는 법:
 *   npx tsx scripts/load-test-applications.ts            # 동시 10, 총 200건
 *   npx tsx scripts/load-test-applications.ts 20 500     # 동시 20, 총 500건
 *   SPREAD_IPS=1 npx tsx scripts/load-test-applications.ts 20 500
 *
 * `SPREAD_IPS=1` 은 요청마다 다른 `x-forwarded-for` 를 보낸다. 요청 횟수 제한(ASM-022,
 * IP 당 60회/60초)에 막히지 않아 **처리 능력 자체**를 볼 수 있다. 끄면 제한이 제대로
 * 걸리는지 확인하는 용도가 된다. 둘 다 한 번씩 돌려 보는 것이 좋다.
 */
const BASE = process.env.LOAD_TEST_BASE ?? "http://127.0.0.1:3100";
const CONCURRENCY = Number(process.argv[2] ?? 10);
const TOTAL = Number(process.argv[3] ?? 200);
const SPREAD_IPS = process.env.SPREAD_IPS === "1";

function assertLocalTarget(): void {
  const url = new URL(BASE);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (!local) {
    throw new Error(
      `부하 테스트는 로컬에서만 돌린다. 받은 주소: ${url.origin} (CLAUDE.md 3장)`,
    );
  }
}

type Sample = { ms: number; status: number };

async function fetchCourseId(): Promise<string | null> {
  const response = await fetch(`${BASE}/api/courses`);
  if (!response.ok) return null;
  const body = (await response.json()) as { items?: Array<{ id: string }> };
  return body.items?.[0]?.id ?? null;
}

async function submitOne(courseId: string, index: number): Promise<Sample> {
  const started = performance.now();
  const response = await fetch(`${BASE}/api/course-applications`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // 횟수 제한은 이 헤더로 요청자를 가른다. 켜면 제한을 피해 처리 능력을 잰다.
      ...(SPREAD_IPS ? { "x-forwarded-for": `10.0.${(index >> 8) & 255}.${index & 255}` } : {}),
    },
    body: JSON.stringify({
      courseId,
      studentName: `부하테스트${index}`,
      guardianPhone: `010-0000-${String(index % 10000).padStart(4, "0")}`,
      schoolName: "부하테스트초등학교",
      department: "초등 문해력",
      grade: "초3",
      privacyConsent: true,
      // 같은 key 가 겹치면 재전송으로 처리되므로 건마다 다르게 만든다.
      idempotencyKey: `loadtest-${Date.now()}-${index}`,
    }),
  });
  // 본문을 끝까지 읽어야 연결이 제때 반환된다.
  await response.text();
  return { ms: performance.now() - started, status: response.status };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[index]);
}

async function main(): Promise<void> {
  assertLocalTarget();

  const courseId = await fetchCourseId();
  if (!courseId) {
    throw new Error(
      "강좌를 찾지 못했다. `npm run db:seed` 로 자료를 넣고 다시 돌린다.",
    );
  }

  console.log(
    `대상 ${BASE} · 동시 ${CONCURRENCY} · 총 ${TOTAL}건 · IP 분산 ${SPREAD_IPS ? "켬" : "끔"}`,
  );

  const samples: Sample[] = [];
  let next = 0;
  const startedAt = performance.now();

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const index = next;
        next += 1;
        if (index >= TOTAL) return;
        samples.push(await submitOne(courseId, index));
      }
    }),
  );

  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  const byStatus = new Map<number, number>();
  for (const sample of samples) {
    byStatus.set(sample.status, (byStatus.get(sample.status) ?? 0) + 1);
  }
  const durations = samples.map((s) => s.ms).sort((a, b) => a - b);
  const created = samples.filter((s) => s.status >= 200 && s.status < 300).length;
  const rateLimited = byStatus.get(429) ?? 0;
  const serverError = samples.filter((s) => s.status >= 500).length;

  console.log(`\n걸린 시간  ${elapsedSeconds.toFixed(1)}초`);
  console.log(`처리량     ${(TOTAL / elapsedSeconds).toFixed(1)} 건/초`);
  console.log(`응답시간   p50 ${percentile(durations, 50)}ms · p95 ${percentile(durations, 95)}ms · p99 ${percentile(durations, 99)}ms`);
  console.log(`상태코드   ${[...byStatus.entries()].map(([k, v]) => `${k}:${v}`).join(" ")}`);
  console.log(`성공 ${created} · 횟수제한(429) ${rateLimited} · 서버오류(5xx) ${serverError}`);

  // 5xx 가 하나라도 있으면 실패로 본다. 429 는 요청 횟수 제한이 제 일을 한 것이라 정상이다.
  if (serverError > 0) {
    console.error(`\n서버 오류 ${serverError}건 — 기준 미달`);
    process.exitCode = 1;
  }
}

void main();

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { db } from "@/server/db";
import { POST as createCourseApplication } from "../../app/api/course-applications/route";
import { POST as lookupRoute } from "../../app/api/reservations/lookup/route";
import { POST as cancelRoute } from "../../app/api/reservations/[id]/cancel/route";
import { GET as applicationsGet } from "../../app/api/admin/applications/route";
import { GET as exportRoute } from "../../app/api/admin/applications/export/route";
import {
  adminCookie,
  courseApplicationBody,
  makeRequest,
  resetDatabase,
  routeContext,
  seedContent,
  type SeededContent,
} from "./helpers";

/** 테스트에서만 쓰는 분명히 가짜인 값. 어떤 응답·로그에도 나오면 안 된다. */
const SECRET_NAME = "홍길동";
const SECRET_PHONE = "010-1234-5678";
const SECRET_SCHOOL = "가상초등학교";

let content: SeededContent;
let logs: string[];

beforeEach(async () => {
  await resetDatabase();
  content = await seedContent();
  logs = [];

  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map((arg) => JSON.stringify(arg)).join(" "));
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

function expectNoPii(text: string): void {
  expect(text).not.toContain(SECRET_NAME);
  expect(text).not.toContain(SECRET_PHONE);
  expect(text).not.toContain("01012345678");
  expect(text).not.toContain(SECRET_SCHOOL);
}

describe("개인정보 노출 방지", () => {
  test("오류 응답에 제출한 이름·연락처·학교가 들어가지 않는다", async () => {
    const closed = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.closedCourseId),
      }),
    );
    expect(closed.status).toBe(409);
    expectNoPii(await closed.text());

    const invalid = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId, { privacyConsent: false }),
      }),
    );
    expect(invalid.status).toBe(422);
    expectNoPii(await invalid.text());

    const missingCourse = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody("missing-course-id"),
      }),
    );
    expect(missingCourse.status).toBe(422);
    expectNoPii(await missingCourse.text());

    const cancel = await cancelRoute(
      makeRequest("POST", "/api/reservations/missing-id/cancel", {
        body: {
          name: SECRET_NAME,
          phone: SECRET_PHONE,
          kind: "course",
          reservationId: "missing-id",
        },
      }),
      routeContext({ id: "missing-id" }),
    );
    expect(cancel.status).toBe(404);
    expectNoPii(await cancel.text());
  });

  test("정상 저장 응답에도 저장한 개인정보를 그대로 돌려주지 않는다", async () => {
    const response = await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    expect(response.status).toBe(201);
    expectNoPii(await response.text());
  });

  test("신청 처리와 관리자 목록 조회 중 로그에 개인정보가 남지 않는다", async () => {
    // 콘솔 어댑터가 실제로 무엇을 남기는지 함께 확인한다.
    const previousNotifyAdapter = process.env.NOTIFY_ADAPTER;
    process.env.NOTIFY_ADAPTER = "console";

    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const cookie = await adminCookie();
    await applicationsGet(
      makeRequest("GET", "/api/admin/applications?kind=course", { cookie }),
    );
    await lookupRoute(
      makeRequest("POST", "/api/reservations/lookup", {
        body: { name: SECRET_NAME, phone: SECRET_PHONE },
      }),
    );

    process.env.NOTIFY_ADAPTER = previousNotifyAdapter;

    expect(logs.length).toBeGreaterThan(0);
    expectNoPii(logs.join("\n"));
  });

  test("감사기록에는 이름·연락처·검색어가 남지 않는다", async () => {
    await createCourseApplication(
      makeRequest("POST", "/api/course-applications", {
        body: courseApplicationBody(content.openCourseId),
      }),
    );
    const cookie = await adminCookie();
    await exportRoute(
      makeRequest("GET", "/api/admin/applications/export?kind=course&grade=초4", {
        cookie,
      }),
    );

    const audits = await db.auditLog.findMany();
    expect(audits.length).toBeGreaterThan(0);
    expectNoPii(JSON.stringify(audits));
  });
});

function collectSourceFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".next" || entry.startsWith("."))
        continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (/\.(ts|tsx|mts)$/.test(entry)) files.push(full);
    }
  };
  walk(root);
  return files;
}

describe("레거시 의존 제거", () => {
  /** 주석을 지운 뒤 검사한다. 주석의 레거시 URL 설명은 호출이 아니다. */
  function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  }

  test("BZ 신규 앱 코드가 런타임에 레거시 PHP 서버를 호출하지 않는다", () => {
    const roots = ["app", "src", "prisma"];
    // 레거시 경로를 "출발지"로 받아 308하는 코드는 호출이 아니다. 목적지로 쓰는 것만 금지한다.
    const callPatterns = [
      /fetch\(\s*[`"'][^`"']*munsayu\.com/,
      /fetch\(\s*[`"'][^`"']*\.php/,
      /(?:redirect|permanentRedirect)\(\s*[`"'][^`"']*\.php/,
      /(?:href|action)\s*=\s*[`"'][^`"']*\.php/,
      /[`"']https?:\/\/munsayu\.com\/[^`"']+[`"']/,
    ];
    const offenders: string[] = [];

    for (const root of roots) {
      for (const file of collectSourceFiles(root)) {
        const code = stripComments(readFileSync(file, "utf8"));
        if (callPatterns.some((pattern) => pattern.test(code))) offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  test("BZ 레거시 경로 대응표는 목적지가 아니라 출발지로만 쓴다", () => {
    // proxy.ts 는 레거시 `/bbs/*.php` 를 신규 경로로 308 하는 유일한 지점이다.
    const proxySource = stripComments(readFileSync("proxy.ts", "utf8"));
    const phpOccurrences = proxySource.match(/[`"'][^`"']*\.php[^`"']*[`"']/g) ?? [];
    expect(phpOccurrences.length).toBeGreaterThan(0);

    // 모든 .php 문자열은 비교 대상(출발지)이고, 어떤 것도 리다이렉트 목적지가 되지 않아야 한다.
    expect(
      /(?:redirect|rewrite|NextResponse\.redirect)\([^)]*\.php/.test(proxySource),
    ).toBe(false);
  });

  test("BZ canonical 도메인만 munsayu.com 을 쓰고 경로는 붙이지 않는다", () => {
    const config = stripComments(readFileSync("src/lib/site-config.ts", "utf8"));
    expect(config).toContain('"https://munsayu.com"');
    // 오리진 뒤에 경로가 붙으면 레거시 엔드포인트를 가리킬 수 있다.
    expect(/https:\/\/munsayu\.com\/\S/.test(config)).toBe(false);
  });
});

import { db } from "@/server/db";
import { getMemoryMailAdapter } from "@/server/adapters/mail";
import { getMemoryNotifyAdapter } from "@/server/adapters/notify";
import { hashPassword } from "@/server/auth/password";
import { resetRateLimits } from "@/server/rate-limit";
import { POST as loginRoute } from "../../app/api/auth/login/route";
import { fixturePassword } from "../fixtures/passwords";

export const TEST_ORIGIN = "http://127.0.0.1";

/** 통합 테스트용 가짜 자격 증명. 실제 계정과 겹치지 않는 값만 쓴다. */
export const FAKE = {
  adminLoginId: "testadmin",
  adminPassword: fixturePassword("admin-0001"),
  memberLoginId: "testmember",
  memberPassword: fixturePassword("member-0001"),
} as const;

/** 테스트 DB의 모든 테이블을 비운다. 마이그레이션 기록은 남긴다. */
export async function resetDatabase(): Promise<void> {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length > 0) {
    const list = tables.map((row) => `"public"."${row.tablename}"`).join(", ");
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
  resetRateLimits();
  getMemoryMailAdapter().clear();
  getMemoryNotifyAdapter().clear();
}

export type RequestOptions = {
  body?: unknown;
  cookie?: string;
  headers?: Record<string, string>;
};

export function makeRequest(
  method: string,
  path: string,
  options: RequestOptions = {},
): Request {
  const headers = new Headers(options.headers);
  if (options.cookie) headers.set("cookie", options.cookie);
  if (options.body !== undefined) headers.set("content-type", "application/json");

  return new Request(`${TEST_ORIGIN}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

/** 동적 경로 핸들러의 두 번째 인수 모양을 만든다. */
export function routeContext<T extends Record<string, string>>(
  params: T,
): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

export function cookiesFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .filter((pair) => !pair.endsWith("="))
    .join("; ");
}

export async function createAdminUser(
  loginId: string = FAKE.adminLoginId,
  password: string = FAKE.adminPassword,
): Promise<{ id: string }> {
  return db.user.create({
    data: {
      loginId,
      passwordHash: await hashPassword(password),
      name: "가상관리자",
      email: `${loginId}@example.test`,
      phone: "010-0000-0000",
      role: "ADMIN",
    },
    select: { id: true },
  });
}

export async function createMemberUser(
  loginId: string = FAKE.memberLoginId,
  password: string = FAKE.memberPassword,
): Promise<{ id: string }> {
  return db.user.create({
    data: {
      loginId,
      passwordHash: await hashPassword(password),
      name: "가상회원",
      email: `${loginId}@example.test`,
      phone: "010-0000-0001",
      role: "MEMBER",
    },
    select: { id: true },
  });
}

/** 로그인 경로를 실제로 호출해 세션 쿠키를 받는다. */
export async function login(
  loginId: string,
  password: string,
  rememberMe = false,
): Promise<{ response: Response; cookie: string }> {
  const response = await loginRoute(
    makeRequest("POST", "/api/auth/login", {
      body: { loginId, password, rememberMe },
    }),
  );
  return { response, cookie: cookiesFrom(response) };
}

export async function adminCookie(): Promise<string> {
  await createAdminUser();
  const { cookie } = await login(FAKE.adminLoginId, FAKE.adminPassword);
  return cookie;
}

export async function memberCookie(): Promise<string> {
  await createMemberUser();
  const { cookie } = await login(FAKE.memberLoginId, FAKE.memberPassword);
  return cookie;
}

export type SeededContent = {
  campusId: string;
  secondCampusId: string;
  openCourseId: string;
  closedCourseId: string;
  openStatusOptionId: string;
  closedStatusOptionId: string;
  openEventId: string;
  closedEventId: string;
};

/** 신청·예약 테스트가 쓰는 최소 콘텐츠. 모두 가짜 값이다. */
export async function seedContent(): Promise<SeededContent> {
  const campus = await db.campus.create({ data: { name: "대치본원" } });
  const secondCampus = await db.campus.create({ data: { name: "분당점" } });

  const openCourse = await db.course.create({
    data: {
      campusId: campus.id,
      title: "4학년 독해/논리반(주중반) 4회",
      sectionTitle: "정규강좌",
      gradeTitle: "초등학교 4학년",
      scheduleText: "화,수,목,금 15/18시",
      startDate: new Date("2027-03-02T00:00:00.000Z"),
      displayOrder: 1,
      intakeStatus: "OPEN",
    },
  });
  const closedCourse = await db.course.create({
    data: {
      campusId: campus.id,
      title: "5학년 비문학 독해 특강(주말반) 8회",
      displayOrder: 2,
      intakeStatus: "CLOSED",
    },
  });

  const openStatus = await db.eventStatusOption.create({
    data: { label: "접수중", sortOrder: 1, isClosed: false },
  });
  const closedStatus = await db.eventStatusOption.create({
    data: { label: "접수마감", sortOrder: 3, isClosed: true },
  });

  const openEvent = await db.event.create({
    data: {
      campusId: campus.id,
      managementCode: "2027D1",
      title: "2027 신학기 학부모 설명회 (대치)",
      startsAt: new Date("2027-02-20T02:00:00.000Z"),
      statusOptionId: openStatus.id,
    },
  });
  const closedEvent = await db.event.create({
    data: {
      campusId: secondCampus.id,
      managementCode: "2026D5",
      title: "2026 겨울 특강 설명회",
      startsAt: new Date("2026-12-05T02:00:00.000Z"),
      statusOptionId: closedStatus.id,
    },
  });

  return {
    campusId: campus.id,
    secondCampusId: secondCampus.id,
    openCourseId: openCourse.id,
    closedCourseId: closedCourse.id,
    openStatusOptionId: openStatus.id,
    closedStatusOptionId: closedStatus.id,
    openEventId: openEvent.id,
    closedEventId: closedEvent.id,
  };
}

let keyCounter = 0;

/** 테스트마다 다른 idempotency key. 길이는 계약 최소값(16자)을 넘긴다. */
export function newIdempotencyKey(prefix = "test"): string {
  keyCounter += 1;
  return `${prefix}-idem-key-${String(keyCounter).padStart(6, "0")}`;
}

export function courseApplicationBody(
  courseId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    courseId,
    studentName: "홍길동",
    guardianPhone: "010-1234-5678",
    schoolName: "가상초등학교",
    department: "초등 문해력",
    grade: "초4",
    privacyConsent: true,
    idempotencyKey: newIdempotencyKey("course"),
    ...overrides,
  };
}

export function eventReservationBody(
  eventId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    eventId,
    name: "김학부모",
    phone: "010-2222-3333",
    grade: "초4",
    attendeeCount: 2,
    privacyConsent: true,
    idempotencyKey: newIdempotencyKey("event"),
    ...overrides,
  };
}

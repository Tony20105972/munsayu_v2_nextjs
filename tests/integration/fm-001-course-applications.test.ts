import { beforeEach, describe, expect, test } from "vitest";
import { db, isUniqueViolation } from "@/server/db";
import { getRetentionSetting } from "@/server/services/privacy";
import { POST as createCourseApplication } from "../../app/api/course-applications/route";
import {
  courseApplicationBody,
  makeRequest,
  newIdempotencyKey,
  resetDatabase,
  seedContent,
  type SeededContent,
} from "./helpers";

let content: SeededContent;

async function post(body: Record<string, unknown>): Promise<Response> {
  return createCourseApplication(
    makeRequest("POST", "/api/course-applications", { body }),
  );
}

beforeEach(async () => {
  await resetDatabase();
  content = await seedContent();
});

describe("FM-001 강좌 수강 신청", () => {
  test("FM-001 강좌 신청: 정상 입력이면 201로 저장된다", async () => {
    const response = await post(courseApplicationBody(content.openCourseId));
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body.replayed).toBe(false);
    expect(typeof body.id).toBe("string");

    const saved = await db.courseApplication.findUniqueOrThrow({
      where: { id: body.id },
    });
    expect(saved.status).toBe("PENDING");
    expect(saved.studentName).toBe("홍길동");
    expect(saved.guardianPhone).toBe("010-1234-5678");
    expect(saved.privacyConsentAt).toBeInstanceOf(Date);
    expect(saved.retentionPolicyVersion).toBe("legacy-ev-0006-v1");
  });

  test("FM-001 강좌 신청: 필수값 누락 시 422", async () => {
    const body = courseApplicationBody(content.openCourseId);
    delete body.studentName;

    const response = await post(body);
    expect(response.status).toBe(422);

    const payload = await response.json();
    expect(payload.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(payload.fieldErrors)).toContain("studentName");
    expect(await db.courseApplication.count()).toBe(0);
  });

  test("FM-001 강좌 신청: 동의하지 않으면 422", async () => {
    const response = await post(
      courseApplicationBody(content.openCourseId, { privacyConsent: false }),
    );
    expect(response.status).toBe(422);

    const payload = await response.json();
    expect(Object.keys(payload.fieldErrors)).toContain("privacyConsent");
    expect(await db.courseApplication.count()).toBe(0);
  });

  test("FM-001 강좌 신청: 휴대폰 형식이 틀리면 422", async () => {
    const response = await post(
      courseApplicationBody(content.openCourseId, { guardianPhone: "02-123-4567" }),
    );
    expect(response.status).toBe(422);
    expect(Object.keys((await response.json()).fieldErrors)).toContain("guardianPhone");
  });

  test("FM-001 강좌 신청: 없는 강좌면 422", async () => {
    const response = await post(courseApplicationBody("missing-course-id"));
    expect(response.status).toBe(422);
    expect(Object.keys((await response.json()).fieldErrors)).toContain("courseId");
  });

  test("FM-001 강좌 신청: 접수마감 강좌는 409 INTAKE_CLOSED", async () => {
    const response = await post(courseApplicationBody(content.closedCourseId));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("INTAKE_CLOSED");
    expect(await db.courseApplication.count()).toBe(0);
  });

  test("FM-001 강좌 신청: 같은 연락처로 다시 신청하면 두 건 모두 저장된다", async () => {
    const first = await post(courseApplicationBody(content.openCourseId));
    const second = await post(courseApplicationBody(content.openCourseId));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect((await first.json()).id).not.toBe((await second.json()).id);
    expect(
      await db.courseApplication.count({ where: { guardianPhone: "010-1234-5678" } }),
    ).toBe(2);
  });

  test("FM-001 강좌 신청: 같은 idempotencyKey 재전송은 1건만 저장하고 replayed=true", async () => {
    const idempotencyKey = newIdempotencyKey("course-replay");
    const body = courseApplicationBody(content.openCourseId, { idempotencyKey });

    const first = await post(body);
    const second = await post(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const firstPayload = await first.json();
    const secondPayload = await second.json();
    expect(firstPayload.replayed).toBe(false);
    expect(secondPayload.replayed).toBe(true);
    expect(secondPayload.id).toBe(firstPayload.id);
    expect(await db.courseApplication.count()).toBe(1);
  });

  test("FM-001 강좌 신청: 같은 idempotencyKey를 동시에 보내도 1건만 저장된다", async () => {
    const idempotencyKey = newIdempotencyKey("course-race");
    const body = courseApplicationBody(content.openCourseId, { idempotencyKey });

    // 보존 설정 기본 행을 먼저 만들어 둔다. 그래야 동시 요청이 신청 저장 지점에서 바로 부딪힌다.
    await getRetentionSetting();

    // 같은 key를 동시에 보낸다. 트랜잭션과 유일 제약으로 한 건만 저장돼야 한다.
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => post({ ...body })),
    );

    expect(responses.map((response) => response.status)).toEqual([
      201, 201, 201, 201, 201,
    ]);

    const payloads = await Promise.all(responses.map((response) => response.json()));
    const ids = new Set(payloads.map((payload) => payload.id));
    expect(ids.size).toBe(1);
    // 한 건만 새로 저장되고 나머지는 재전송으로 처리된다. 500은 나가지 않는다.
    expect(payloads.filter((payload) => payload.replayed === false)).toHaveLength(1);
    expect(payloads.filter((payload) => payload.replayed === true)).toHaveLength(4);

    expect(await db.courseApplication.count()).toBe(1);
    expect(await db.courseApplication.count({ where: { idempotencyKey } })).toBe(1);
  });

  test("FM-001 강좌 신청: 같은 idempotencyKey 두 번째 저장은 DB 유일 제약이 막고 재전송 신호로 분류된다", async () => {
    const idempotencyKey = newIdempotencyKey("course-unique");
    const created = await post(
      courseApplicationBody(content.openCourseId, { idempotencyKey }),
    );
    expect(created.status).toBe(201);

    // 서비스 밖에서 같은 key로 한 건 더 넣으려 하면 DB가 막는다.
    // 서비스의 경합 복구 코드가 이 오류를 재전송으로 분류한다.
    let caught: unknown;
    try {
      await db.courseApplication.create({
        data: {
          courseId: content.openCourseId,
          studentName: "홍길동",
          guardianPhone: "010-1234-5678",
          schoolName: "가상초등학교",
          department: "초등 문해력",
          grade: "초4",
          privacyConsentAt: new Date(),
          retentionPolicyVersion: "legacy-ev-0006-v1",
          idempotencyKey,
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeDefined();
    expect(isUniqueViolation(caught)).toBe(true);
    expect(await db.courseApplication.count({ where: { idempotencyKey } })).toBe(1);
  });

  test("FM-001 강좌 신청: 하이픈 없는 번호도 표준형으로 저장된다", async () => {
    const response = await post(
      courseApplicationBody(content.openCourseId, { guardianPhone: "01012345678" }),
    );
    expect(response.status).toBe(201);

    const saved = await db.courseApplication.findUniqueOrThrow({
      where: { id: (await response.json()).id },
    });
    expect(saved.guardianPhone).toBe("010-1234-5678");
  });
});

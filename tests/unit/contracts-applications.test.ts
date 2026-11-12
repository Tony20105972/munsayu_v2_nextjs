import { describe, expect, it } from "vitest";
import {
  COURSE_DEPARTMENTS,
  COURSE_PRIVACY_CONSENT,
  ELEMENTARY_GRADES,
  EVENT_ATTENDEE_MAX,
  EVENT_PRIVACY_CONSENT,
  courseApplicationSchema,
  eventReservationSchema,
} from "@/lib/contracts";

/** 레거시 예약 모달 관찰값(EV-0006)이 계약 상수에 그대로 들어 있는지 지킨다. */
describe("FM-001 강좌 신청 계약", () => {
  const valid = {
    courseId: "course-1",
    studentName: "홍길동",
    guardianPhone: "010-0000-0000",
    schoolName: "대치초등학교",
    department: "어휘·글쓰기",
    grade: "초4",
    privacyConsent: true as const,
    idempotencyKey: "a".repeat(20),
  };

  it("FM-001: 레거시 선택지 목록이 관찰값과 같다", () => {
    expect(COURSE_DEPARTMENTS).toEqual(["초등 문해력", "어휘·글쓰기", "진단평가"]);
    expect(ELEMENTARY_GRADES).toEqual([
      "예비초",
      "초1",
      "초2",
      "초3",
      "초4",
      "초5",
      "초6",
    ]);
  });

  it("FM-001: 레거시 동의 문구가 관찰 원문과 같다", () => {
    expect(COURSE_PRIVACY_CONSENT.purpose).toBe(
      "수강 신청반 좌석 배정 관리 및 예약 확정 안내 문자 발송",
    );
    expect(COURSE_PRIVACY_CONSENT.collectedItems).toBe(
      "이름, 휴대폰 번호, 학생 학교/학년/수강과정",
    );
    expect(COURSE_PRIVACY_CONSENT.retention).toBe(
      "해당 강좌 종강 및 정규 등록 안내 완료 시점 즉시 파기",
    );
    expect(COURSE_PRIVACY_CONSENT.checkboxLabel).toBe(
      "위 명시 사항에 동의합니다. (필수)",
    );
    expect(COURSE_PRIVACY_CONSENT.submitLabel).toBe("수강 예약 신청서 제출하기");
  });

  it("FM-001: 올바른 입력을 통과시키고 연락처를 표준형으로 바꾼다", () => {
    const parsed = courseApplicationSchema.parse({
      ...valid,
      guardianPhone: "01012345678",
    });
    expect(parsed.guardianPhone).toBe("010-1234-5678");
  });

  it("FM-001: 동의하지 않으면 거부하고 한국어로 알린다", () => {
    const result = courseApplicationSchema.safeParse({
      ...valid,
      privacyConsent: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("동의해야");
    }
  });

  it("FM-001: 계약에 없는 과정·학년은 거부한다", () => {
    expect(
      courseApplicationSchema.safeParse({ ...valid, department: "논술" }).success,
    ).toBe(false);
    expect(courseApplicationSchema.safeParse({ ...valid, grade: "중1" }).success).toBe(
      false,
    );
  });

  it("FM-001: 휴대폰 형식이 아니면 거부한다", () => {
    for (const phone of ["12345", "02-563-5972", "010-123", "abc"]) {
      expect(
        courseApplicationSchema.safeParse({ ...valid, guardianPhone: phone }).success,
      ).toBe(false);
    }
  });

  it("FM-001: idempotency key가 짧으면 거부한다", () => {
    expect(
      courseApplicationSchema.safeParse({ ...valid, idempotencyKey: "short" }).success,
    ).toBe(false);
  });
});

describe("FM-002 설명회 예약 계약", () => {
  const valid = {
    eventId: "event-1",
    name: "홍길동",
    phone: "010-0000-0000",
    grade: "초4",
    attendeeCount: 2,
    privacyConsent: true as const,
    idempotencyKey: "b".repeat(20),
  };

  it("FM-002: 참석 인원 1~2명은 허용한다", () => {
    expect(
      eventReservationSchema.safeParse({ ...valid, attendeeCount: 1 }).success,
    ).toBe(true);
    expect(
      eventReservationSchema.safeParse({ ...valid, attendeeCount: 2 }).success,
    ).toBe(true);
    expect(EVENT_ATTENDEE_MAX).toBe(2);
  });

  it("FM-002: 참석 인원 3명 이상은 거부하고 상한을 문구로 알린다", () => {
    const result = eventReservationSchema.safeParse({ ...valid, attendeeCount: 3 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "참석 인원은 최대 2명까지 신청할 수 있습니다.",
      );
    }
  });

  it("FM-002: 참석 인원 0명 이하는 거부한다", () => {
    expect(
      eventReservationSchema.safeParse({ ...valid, attendeeCount: 0 }).success,
    ).toBe(false);
  });

  it("FM-002: 설명회 동의 문구는 강좌와 다른 보존 정책 버전을 쓴다 (BZ-002)", () => {
    // 문구가 서로 다르므로 버전도 달라야 한다. 같으면 동의 기록이 신청자가 보지 않은
    // 문구를 가리킨다. 독립 리뷰 B-1에서 지적된 사안이다.
    expect(EVENT_PRIVACY_CONSENT.retention).not.toBe(COURSE_PRIVACY_CONSENT.retention);
    expect(EVENT_PRIVACY_CONSENT.policyVersion).not.toBe(
      COURSE_PRIVACY_CONSENT.policyVersion,
    );
    // 동의 체크박스 문구와 안내 제목은 레거시 관찰값을 공유한다. (EV-0006, ASM-009)
    expect(EVENT_PRIVACY_CONSENT.checkboxLabel).toBe(
      COURSE_PRIVACY_CONSENT.checkboxLabel,
    );
    expect(EVENT_PRIVACY_CONSENT.heading).toBe(COURSE_PRIVACY_CONSENT.heading);
  });
});

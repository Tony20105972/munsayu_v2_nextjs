import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { DEFAULT_CONSULTATION_TYPES } from "@/lib/contracts";
import { POST as consultationPost } from "../../app/api/consultation-applications/route";
import { GET as consultationsGet } from "../../app/api/admin/consultations/route";
import { GET as consultationsExport } from "../../app/api/admin/consultations/export/route";
import { POST as smsPost } from "../../app/api/sms-subscriptions/route";
import { GET as smsGet } from "../../app/api/admin/sms-subscriptions/route";
import { GET as smsExport } from "../../app/api/admin/sms-subscriptions/export/route";
import { GET as settingsGet } from "../../app/api/admin/settings/route";
import {
  adminCookie,
  makeRequest,
  memberCookie,
  newIdempotencyKey,
  resetDatabase,
} from "./helpers";
import { ensureConsultationTypes } from "@/server/services/consultations";
import {
  LEGACY_DIAGNOSIS_FORM_URL,
  getSiteSettings,
  updateSiteSettings,
} from "@/server/services/settings";

/**
 * AD-009 입학진단·상담 신청 관리와 AD-010 설명회 알림 신청.
 *
 * AD-009 공개 화면에는 신청 폼을 두지 않는다. 버튼은 관리자가 등록한 구글 폼 주소로
 * 보낸다. (사용자 결정 2026-11-12) // ASM-082
 * AD-010 은 **문자를 보내지 않는다.** 신청 내역만 남긴다. (D4) // ASM-086
 */

beforeEach(async () => {
  await resetDatabase();
});

async function firstTypeId(): Promise<string> {
  await ensureConsultationTypes();
  const type = await db.consultationTypeOption.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return type.id;
}

function consultationBody(
  consultationTypeId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    guardianName: "김학부모",
    guardianPhone: "010-7777-8888",
    studentGrade: "초5",
    consultationTypeId,
    inquiry: "진단평가 일정을 알고 싶습니다.",
    privacyConsent: true,
    idempotencyKey: newIdempotencyKey("consultation"),
    ...overrides,
  };
}

function smsBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    grade: "초3",
    studentName: "홍학생",
    schoolName: "가상초등학교",
    guardianPhone: "010-3333-4444",
    privacyConsent: true,
    notifyConsent: true,
    idempotencyKey: newIdempotencyKey("sms"),
    ...overrides,
  };
}

describe("AD-009 상담 유형과 신청 입력", () => {
  test("AD-009 기본 상담 유형 두 가지를 만든다", async () => {
    await ensureConsultationTypes();
    const labels = (
      await db.consultationTypeOption.findMany({ orderBy: { sortOrder: "asc" } })
    ).map((row) => row.label);

    expect(labels).toEqual([...DEFAULT_CONSULTATION_TYPES]);
  });

  test("AD-009 정상 입력이 저장된다", async () => {
    const typeId = await firstTypeId();
    const response = await consultationPost(
      makeRequest("POST", "/api/consultation-applications", {
        body: consultationBody(typeId),
      }),
    );

    expect(response.status).toBe(201);
    const saved = await db.consultationApplication.findFirstOrThrow();
    expect(saved.guardianName).toBe("김학부모");
    expect(saved.status).toBe("PENDING");
  });

  test("AD-009 필수값 누락: 학부모 성함이 없으면 422", async () => {
    const typeId = await firstTypeId();
    const response = await consultationPost(
      makeRequest("POST", "/api/consultation-applications", {
        body: consultationBody(typeId, { guardianName: "" }),
      }),
    );
    expect(response.status).toBe(422);
  });

  test("AD-009 형식 오류: 연락처 형식이 아니면 422", async () => {
    const typeId = await firstTypeId();
    const response = await consultationPost(
      makeRequest("POST", "/api/consultation-applications", {
        body: consultationBody(typeId, { guardianPhone: "1234" }),
      }),
    );
    expect(response.status).toBe(422);
  });

  test("AD-009 동의 누락: 개인정보 동의가 없으면 422", async () => {
    const typeId = await firstTypeId();
    const response = await consultationPost(
      makeRequest("POST", "/api/consultation-applications", {
        body: consultationBody(typeId, { privacyConsent: false }),
      }),
    );
    expect(response.status).toBe(422);
    expect(await db.consultationApplication.count()).toBe(0);
  });

  test("AD-009 숨긴 상담 유형으로는 신청할 수 없다", async () => {
    const typeId = await firstTypeId();
    await db.consultationTypeOption.update({
      where: { id: typeId },
      data: { isActive: false },
    });

    const response = await consultationPost(
      makeRequest("POST", "/api/consultation-applications", {
        body: consultationBody(typeId),
      }),
    );
    expect(response.status).toBe(422);
  });
});

describe("AD-009 관리자 목록", () => {
  async function seedApplication(
    overrides: Record<string, unknown> = {},
  ): Promise<void> {
    const typeId = await firstTypeId();
    const response = await consultationPost(
      makeRequest("POST", "/api/consultation-applications", {
        body: consultationBody(typeId, overrides),
      }),
    );
    expect(response.status).toBe(201);
  }

  test("AD-009 목록은 이름·연락처를 가리고 상태별 건수를 함께 준다", async () => {
    await seedApplication();
    const cookie = await adminCookie();

    const response = await consultationsGet(
      makeRequest("GET", "/api/admin/consultations", { cookie }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.total).toBe(1);
    expect(body.counts).toEqual({
      total: 1,
      pending: 1,
      completed: 0,
      cancelled: 0,
    });
    expect(body.items[0].maskedGuardianName).not.toBe("김학부모");
    expect(body.items[0].maskedGuardianPhone).not.toContain("7777");
    // 문의 내용은 목록에서 있음/없음만 알린다.
    expect(body.items[0].hasInquiry).toBe(true);
    expect(body.items[0].inquiry).toBeUndefined();
  });

  test("AD-009 학부모 성함·연락처로 검색한다", async () => {
    await seedApplication();
    const cookie = await adminCookie();

    const byName = await consultationsGet(
      makeRequest("GET", "/api/admin/consultations?keyword=김학부모", { cookie }),
    );
    const byPhone = await consultationsGet(
      makeRequest("GET", "/api/admin/consultations?keyword=7777", { cookie }),
    );
    const miss = await consultationsGet(
      makeRequest("GET", "/api/admin/consultations?keyword=없는사람", { cookie }),
    );

    expect((await byName.json()).total).toBe(1);
    expect((await byPhone.json()).total).toBe(1);
    expect((await miss.json()).total).toBe(0);
  });

  test("AD-009 CSV 는 필터 결과 전체를 내보내고 기록을 남긴다", async () => {
    await seedApplication();
    const cookie = await adminCookie();

    const response = await consultationsExport(
      makeRequest("GET", "/api/admin/consultations/export", { cookie }),
    );
    expect(response.status).toBe(200);

    const csv = await response.text();
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain("김학부모");

    const audit = await db.auditLog.findFirst({
      where: { action: "CSV_EXPORT", resourceType: "ConsultationApplication" },
    });
    expect(audit?.filterSummary).toContain("count=1");
    expect(audit?.filterSummary).not.toContain("김학부모");
  });

  test("AD-009 권한 없음: 회원 세션은 목록을 볼 수 없다", async () => {
    const cookie = await memberCookie();
    const response = await consultationsGet(
      makeRequest("GET", "/api/admin/consultations", { cookie }),
    );
    expect(response.status).toBe(403);
  });

  test("AD-009 비로그인: 목록은 401 이다", async () => {
    const response = await consultationsGet(
      makeRequest("GET", "/api/admin/consultations"),
    );
    expect(response.status).toBe(401);
  });
});

describe("AD-009 진단 신청 버튼 주소 설정", () => {
  test("설정이 없으면 레거시 구글 폼 주소를 쓴다", async () => {
    const settings = await getSiteSettings();
    expect(settings.diagnosisCtaExternalUrl).toBe(LEGACY_DIAGNOSIS_FORM_URL);
    expect(settings.recruitMenuVisible).toBe(false);
  });

  test("관리자가 주소를 바꾸면 그 값이 보인다", async () => {
    const admin = await adminCookie();
    const { id } = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });

    await updateSiteSettings(id, {
      diagnosisCtaExternalUrl: "https://forms.gle/example-new-form",
      recruitMenuVisible: true,
      resumeMaxBytes: 10 * 1024 * 1024,
      mediaMaxUploadBytes: 20 * 1024 * 1024,
    });

    const response = await settingsGet(
      makeRequest("GET", "/api/admin/settings", { cookie: admin }),
    );
    const body = await response.json();

    expect(body.diagnosisCtaExternalUrl).toBe("https://forms.gle/example-new-form");
    expect(body.recruitMenuVisible).toBe(true);
  });
});

describe("AD-010 설명회 알림 신청", () => {
  test("AD-010 정상 신청이 저장되고 문자는 보내지 않는다", async () => {
    const response = await smsPost(
      makeRequest("POST", "/api/sms-subscriptions", { body: smsBody() }),
    );
    expect(response.status).toBe(201);

    const saved = await db.smsSubscription.findFirstOrThrow();
    expect(saved.studentName).toBe("홍학생");
    expect(saved.notifyConsentAt).toBeInstanceOf(Date);
  });

  test("AD-010 필수값 누락: 학교명이 없으면 422", async () => {
    const response = await smsPost(
      makeRequest("POST", "/api/sms-subscriptions", {
        body: smsBody({ schoolName: "" }),
      }),
    );
    expect(response.status).toBe(422);
  });

  test("AD-010 동의 누락: 알림 수신 동의가 없으면 422", async () => {
    const response = await smsPost(
      makeRequest("POST", "/api/sms-subscriptions", {
        body: smsBody({ notifyConsent: false }),
      }),
    );
    expect(response.status).toBe(422);
    expect(await db.smsSubscription.count()).toBe(0);
  });

  test("AD-010 같은 key 재전송은 새로 저장하지 않는다", async () => {
    const key = newIdempotencyKey("sms-replay");
    await smsPost(
      makeRequest("POST", "/api/sms-subscriptions", {
        body: smsBody({ idempotencyKey: key }),
      }),
    );
    const second = await smsPost(
      makeRequest("POST", "/api/sms-subscriptions", {
        body: smsBody({ idempotencyKey: key }),
      }),
    );

    expect((await second.json()).replayed).toBe(true);
    expect(await db.smsSubscription.count()).toBe(1);
  });

  test("AD-010 관리자 목록은 이름·학교·연락처를 가린다", async () => {
    await smsPost(makeRequest("POST", "/api/sms-subscriptions", { body: smsBody() }));
    const cookie = await adminCookie();

    const response = await smsGet(
      makeRequest("GET", "/api/admin/sms-subscriptions", { cookie }),
    );
    const body = await response.json();

    expect(body.total).toBe(1);
    expect(body.items[0].maskedStudentName).not.toBe("홍학생");
    expect(body.items[0].maskedGuardianPhone).not.toContain("3333");
  });

  test("AD-010 CSV 는 기록을 남긴다", async () => {
    await smsPost(makeRequest("POST", "/api/sms-subscriptions", { body: smsBody() }));
    const cookie = await adminCookie();

    const response = await smsExport(
      makeRequest("GET", "/api/admin/sms-subscriptions/export", { cookie }),
    );
    expect(response.status).toBe(200);
    expect((await response.text()).split("\r\n")).toHaveLength(2);

    const audit = await db.auditLog.findFirst({
      where: { action: "CSV_EXPORT", resourceType: "SmsSubscription" },
    });
    expect(audit).not.toBeNull();
  });

  test("AD-010 비로그인: 관리자 목록은 401 이다", async () => {
    const response = await smsGet(makeRequest("GET", "/api/admin/sms-subscriptions"));
    expect(response.status).toBe(401);
  });
});

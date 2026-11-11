import { beforeEach, describe, expect, test } from "vitest";
import { AuditAction } from "@prisma/client";
import { AUDIT_ACTIONS } from "@/lib/contracts";
import { PUBLIC_RATE_LIMIT } from "@/server/rate-limit";
import { POST as lookupRoute } from "../../app/api/reservations/lookup/route";
import { makeRequest, resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

describe("계약 일치", () => {
  test("AuditAction enum이 공유 계약의 AUDIT_ACTIONS를 모두 담는다", () => {
    const schemaActions = Object.keys(AuditAction).sort();
    expect(schemaActions).toEqual([...AUDIT_ACTIONS].sort());
  });
});

describe("요청 횟수 제한", () => {
  test("공개 조회 경로는 상한을 넘으면 429 RATE_LIMITED", async () => {
    const body = { name: "홍길동", phone: "010-1234-5678" };

    for (let index = 0; index < PUBLIC_RATE_LIMIT.limit; index += 1) {
      const response = await lookupRoute(
        makeRequest("POST", "/api/reservations/lookup", {
          body,
          headers: { "x-forwarded-for": "203.0.113.10" },
        }),
      );
      expect(response.status).toBe(200);
    }

    const limited = await lookupRoute(
      makeRequest("POST", "/api/reservations/lookup", {
        body,
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );
    expect(limited.status).toBe(429);
    expect((await limited.json()).code).toBe("RATE_LIMITED");
  });

  test("요청자가 다르면 제한 카운터도 분리된다", async () => {
    const body = { name: "홍길동", phone: "010-1234-5678" };

    for (let index = 0; index < PUBLIC_RATE_LIMIT.limit; index += 1) {
      await lookupRoute(
        makeRequest("POST", "/api/reservations/lookup", {
          body,
          headers: { "x-forwarded-for": "203.0.113.10" },
        }),
      );
    }

    const other = await lookupRoute(
      makeRequest("POST", "/api/reservations/lookup", {
        body,
        headers: { "x-forwarded-for": "203.0.113.20" },
      }),
    );
    expect(other.status).toBe(200);
  });
});

import "@/server/server-only";
import type { ApplicationCreatedResult, EventReservationInput } from "@/lib/contracts";
import { db } from "@/server/db";
import { intakeClosed, validationFailed } from "@/server/errors";
import { notifyQuietly } from "@/server/adapters/notify";
import {
  getRetentionSetting,
  resolveRetentionPolicyVersion,
} from "@/server/services/privacy";

/**
 * FM-002 설명회 예약.
 *
 * 마감 상태 확인과 저장을 하나의 트랜잭션에서 한다. 마감 여부는 관리자가 고른
 * 상태 옵션의 `isClosed`만 본다. 정원 숫자는 차단 조건이 아니다. (ASM-001, D9)
 */
export async function createEventReservation(
  input: EventReservationInput,
): Promise<ApplicationCreatedResult> {
  const setting = await getRetentionSetting();
  const retentionPolicyVersion = resolveRetentionPolicyVersion("event", setting);

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.eventReservation.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, createdAt: true },
    });
    if (existing) {
      return { id: existing.id, createdAt: existing.createdAt, replayed: true };
    }

    const event = await tx.event.findUnique({
      where: { id: input.eventId },
      select: { id: true, statusOption: { select: { isClosed: true } } },
    });
    if (!event) {
      throw validationFailed({ eventId: ["설명회를 찾을 수 없습니다."] });
    }
    if (event.statusOption.isClosed) {
      throw intakeClosed();
    }

    const created = await tx.eventReservation.create({
      data: {
        eventId: input.eventId,
        name: input.name,
        phone: input.phone,
        grade: input.grade,
        attendeeCount: input.attendeeCount,
        privacyConsentAt: new Date(),
        retentionPolicyVersion,
        idempotencyKey: input.idempotencyKey,
      },
      select: { id: true, createdAt: true },
    });

    return { id: created.id, createdAt: created.createdAt, replayed: false };
  });

  if (!result.replayed) {
    await notifyQuietly({
      channel: "staff",
      text: "새 설명회 예약 1건이 접수되었습니다.",
    });
  }

  return {
    id: result.id,
    replayed: result.replayed,
    createdAt: result.createdAt.toISOString(),
  };
}

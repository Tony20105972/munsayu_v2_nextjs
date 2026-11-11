import "@/server/server-only";
import type { ApplicationCreatedResult, CourseApplicationInput } from "@/lib/contracts";
import { db } from "@/server/db";
import { intakeClosed, validationFailed } from "@/server/errors";
import { notifyQuietly } from "@/server/adapters/notify";
import {
  getRetentionSetting,
  resolveRetentionPolicyVersion,
} from "@/server/services/privacy";

/**
 * FM-001 강좌 수강 신청.
 *
 * 접수 상태 확인과 저장을 하나의 트랜잭션에서 한다. 정원으로 막지 않고,
 * 같은 연락처의 의도적 재신청도 허용한다. 같은 idempotency key 재전송만 기존 건을 돌려준다.
 * (BLUEPRINT 5장 [확정], ASM-001)
 */
export async function createCourseApplication(
  input: CourseApplicationInput,
): Promise<ApplicationCreatedResult> {
  const setting = await getRetentionSetting();
  const retentionPolicyVersion = resolveRetentionPolicyVersion("course", setting);

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.courseApplication.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, createdAt: true },
    });
    if (existing) {
      return { id: existing.id, createdAt: existing.createdAt, replayed: true };
    }

    const course = await tx.course.findUnique({
      where: { id: input.courseId },
      select: { id: true, intakeStatus: true },
    });
    if (!course) {
      throw validationFailed({ courseId: ["강좌를 찾을 수 없습니다."] });
    }
    if (course.intakeStatus !== "OPEN") {
      throw intakeClosed();
    }

    const created = await tx.courseApplication.create({
      data: {
        courseId: input.courseId,
        studentName: input.studentName,
        guardianPhone: input.guardianPhone,
        schoolName: input.schoolName,
        department: input.department,
        grade: input.grade,
        privacyConsentAt: new Date(),
        retentionPolicyVersion,
        idempotencyKey: input.idempotencyKey,
      },
      select: { id: true, createdAt: true },
    });

    return { id: created.id, createdAt: created.createdAt, replayed: false };
  });

  if (!result.replayed) {
    // 알림 실패는 저장을 되돌리지 않는다. 개인정보는 넣지 않는다. (BLUEPRINT 5장)
    await notifyQuietly({
      channel: "staff",
      text: "새 강좌 수강 신청 1건이 접수되었습니다.",
    });
  }

  return {
    id: result.id,
    replayed: result.replayed,
    createdAt: result.createdAt.toISOString(),
  };
}

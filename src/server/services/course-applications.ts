import "server-only";
import type { ApplicationCreatedResult, CourseApplicationInput } from "@/lib/contracts";
import { db, isUniqueViolation } from "@/server/db";
import { intakeClosed, validationFailed } from "@/server/errors";
import { notifyQuietly } from "@/server/adapters/notify";
import {
  getRetentionSetting,
  resolveRetentionPolicyVersion,
} from "@/server/services/privacy";

type InsertOutcome = { id: string; createdAt: Date; replayed: boolean };

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

  const insertOnce = (): Promise<InsertOutcome> =>
    db.$transaction(async (tx) => {
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

  let result: InsertOutcome;
  try {
    result = await insertOnce();
  } catch (error) {
    // 같은 key가 동시에 들어오면 한쪽이 유일 제약에 걸린다.
    // 이때는 오류를 내보내지 않고 먼저 저장된 건을 재전송 결과로 돌려준다.
    if (!isUniqueViolation(error)) throw error;

    const saved = await db.courseApplication.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, createdAt: true },
    });
    if (!saved) throw error;

    result = { id: saved.id, createdAt: saved.createdAt, replayed: true };
  }

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

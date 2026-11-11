import { z } from "zod";
import { cuidLikeIdSchema, paginationSchema } from "@/lib/contracts";

/**
 * 공유 계약(`src/lib/contracts/`)에 아직 없는 관리자 입력만 여기서 정의한다.
 * 계약에 올려야 할 항목은 docs/reports/phase-4-be-notes.md 의 "조정자에게 요청"에 적었다. // ASM-024
 */

export const adminCourseListSchema = paginationSchema.extend({
  campusId: cuidLikeIdSchema.optional(),
  intakeOpen: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type AdminCourseListInput = z.infer<typeof adminCourseListSchema>;

export const instructorTeamCreateSchema = z.object({
  name: z.string().trim().min(2).max(40),
});
export type InstructorTeamCreateInput = z.infer<typeof instructorTeamCreateSchema>;

export const instructorTeamMembershipDeleteSchema = z.object({
  instructorId: cuidLikeIdSchema,
  teamId: cuidLikeIdSchema,
});
export type InstructorTeamMembershipDeleteInput = z.infer<
  typeof instructorTeamMembershipDeleteSchema
>;

export const applicationDetailSchema = z.object({
  kind: z.enum(["course", "event"]),
  applicationId: cuidLikeIdSchema,
});
export type ApplicationDetailInput = z.infer<typeof applicationDetailSchema>;

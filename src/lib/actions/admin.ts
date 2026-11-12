"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import {
  adminAccountCreateSchema,
  adminAccountDeleteSchema,
  applicationRevealSchema,
  courseIntakeChangeSchema,
  courseUpsertSchema,
  cuidLikeIdSchema,
  eventStatusChangeSchema,
  eventStatusOptionSchema,
  eventUpsertSchema,
  instructorTeamCreateSchema,
  instructorTeamMembershipDeleteSchema,
  instructorTeamMembershipSchema,
  instructorUpsertSchema,
  memberStatusChangeSchema,
  privacyRetentionSettingSchema,
  purgeEligibilitySchema,
  purgeRunSchema,
} from "@/lib/contracts";
import {
  failure,
  formEntries,
  parseInput,
  success,
  toFailure,
} from "@/lib/actions/internal";
import { requireAdminFromCookies } from "@/server/auth/server-component-session";
import {
  revealApplication,
  type RevealedApplication,
} from "@/server/services/applications-admin";
import {
  createCourse,
  deleteCourse,
  setCourseIntake,
  updateCourse,
} from "@/server/services/courses";
import {
  changeEventStatus,
  createEvent,
  createEventStatusOption,
  deleteEvent,
  updateEvent,
} from "@/server/services/events";
import {
  createInstructor,
  createTeam,
  deleteInstructor,
  removeTeamMembership,
  setTeamMembership,
  updateInstructor,
} from "@/server/services/instructors";
import {
  changeMemberStatus,
  createAdminAccount,
  deleteAdminAccount,
} from "@/server/services/members";
import {
  runPurge,
  setPurgeEligibility,
  updateRetentionSetting,
} from "@/server/services/privacy";

/**
 * 관리자 화면(AD-002~AD-008, AD-013)의 Server Action.
 *
 * 모든 동작이 **자기 안에서 다시** 관리자 권한을 확인한다. 레이아웃의 가드만 믿지 않는다.
 * (BLUEPRINT 7장 — 화면에서 숨기는 것은 권한 처리가 아니다)
 * 입력은 공유 계약(`src/lib/contracts/admin.ts`)의 Zod 스키마로 서버에서 검증한다.
 */

/** 관리자가 입력한 날짜·시각은 한국 시간으로 본다. */
function toKstIso(value: string | undefined, kind: "date" | "datetime"): string | null {
  if (!value) {
    return null;
  }
  return kind === "date" ? `${value}T00:00:00+09:00` : `${value}:00+09:00`;
}

/** 체크박스·선택 상자의 참·거짓은 명시적으로 읽는다. `z.coerce.boolean("false")` 는 true 다. */
function readBoolean(raw: Record<string, string>, key: string): boolean {
  const value = raw[key];
  return value === "true" || value === "on" || value === "1";
}

/**
 * 개인정보 동의 안내의 「보유기간」 문구를 보여 주는 공개 경로.
 * 보존 설정이 바뀌면 이 경로들도 함께 무효화해야 한다. (BZ-002)
 */
const PUBLIC_CONSENT_PATHS = [
  "/sub/schedule.n",
  "/sub/schedule.g",
  "/sub/Presentation",
] as const;

function revalidateAdmin(...paths: string[]): void {
  for (const path of paths) {
    revalidatePath(path);
  }
}

/* ------------------------------------------------------------------ */
/* AD-002 회원 관리                                                    */
/* ------------------------------------------------------------------ */

export async function changeMemberStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(memberStatusChangeSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    await changeMemberStatus(admin.id, parsed.value);
    revalidateAdmin("/admin/members", "/admin");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function createAdminAccountAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(adminAccountCreateSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    await createAdminAccount(admin.id, parsed.value);
    revalidateAdmin("/admin/members", "/admin");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteAdminAccountAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(adminAccountDeleteSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    await deleteAdminAccount(admin.id, parsed.value);
    revalidateAdmin("/admin/members", "/admin");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ */
/* AD-003 ~ AD-005 설명회 관리                                         */
/* ------------------------------------------------------------------ */

function eventUpsertInput(formData: FormData): Record<string, unknown> {
  const raw = formEntries(formData);
  return {
    ...raw,
    campusId: raw.campusId ?? null,
    venue: raw.venue ?? null,
    speaker: raw.speaker ?? null,
    startsAt: toKstIso(raw.startsAt, "datetime"),
  };
}

export async function createEventAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const parsed = parseInput(eventUpsertSchema, eventUpsertInput(formData));
    if (!parsed.ok) return parsed.failure;

    await createEvent(parsed.value);
    revalidateAdmin("/admin/events", "/admin", "/sub/Presentation");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateEventAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const eventId = cuidLikeIdSchema.safeParse(formData.get("eventId"));
    if (!eventId.success) return failure("설명회를 찾을 수 없습니다.");

    const parsed = parseInput(eventUpsertSchema, eventUpsertInput(formData));
    if (!parsed.ok) return parsed.failure;

    await updateEvent(eventId.data, parsed.value);
    revalidateAdmin(
      "/admin/events",
      `/admin/events/${eventId.data}`,
      "/sub/Presentation",
    );
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteEventAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const eventId = cuidLikeIdSchema.safeParse(formData.get("eventId"));
    if (!eventId.success) return failure("설명회를 찾을 수 없습니다.");

    await deleteEvent(eventId.data);
    revalidateAdmin("/admin/events", "/admin", "/sub/Presentation");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/** AD-004 상태 변경. 관리자 수동 전환만 있고 자동 전환은 없다. (BZ-001, Q-ADM-05) */
export async function changeEventStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const parsed = parseInput(eventStatusChangeSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    await changeEventStatus(parsed.value);
    revalidateAdmin("/admin/events", "/sub/Presentation");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function createEventStatusOptionAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const raw = formEntries(formData);
    const parsed = parseInput(eventStatusOptionSchema, {
      ...raw,
      isClosed: readBoolean(raw, "isClosed"),
    });
    if (!parsed.ok) return parsed.failure;

    await createEventStatusOption(parsed.value);
    revalidateAdmin("/admin/events");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ */
/* AD-006 강사 관리                                                    */
/* ------------------------------------------------------------------ */

function instructorUpsertInput(formData: FormData): Record<string, unknown> {
  const raw = formEntries(formData);
  return {
    ...raw,
    bio: raw.bio ?? null,
    // 사진은 `public/images/instructors/` 에 커밋된 파일의 키로 고른다. (EV-0012)
    photoStorageKey: raw.photoStorageKey ?? null,
  };
}

export async function createInstructorAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const parsed = parseInput(instructorUpsertSchema, instructorUpsertInput(formData));
    if (!parsed.ok) return parsed.failure;

    await createInstructor(parsed.value);
    revalidateAdmin("/admin/instructors", "/sub/abouttch1", "/sub/abouttch2");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateInstructorAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const instructorId = cuidLikeIdSchema.safeParse(formData.get("instructorId"));
    if (!instructorId.success) return failure("강사를 찾을 수 없습니다.");

    const parsed = parseInput(instructorUpsertSchema, instructorUpsertInput(formData));
    if (!parsed.ok) return parsed.failure;

    await updateInstructor(instructorId.data, parsed.value);
    revalidateAdmin("/admin/instructors", "/sub/abouttch1", "/sub/abouttch2");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteInstructorAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const instructorId = cuidLikeIdSchema.safeParse(formData.get("instructorId"));
    if (!instructorId.success) return failure("강사를 찾을 수 없습니다.");

    await deleteInstructor(instructorId.data);
    revalidateAdmin("/admin/instructors", "/sub/abouttch1", "/sub/abouttch2");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function createTeamAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const parsed = parseInput(instructorTeamCreateSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    await createTeam(parsed.value.name);
    revalidateAdmin("/admin/instructors");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/** 한 강사를 여러 팀에 넣을 수 있고 팀마다 노출 순서를 따로 둔다. (ASM-003) */
export async function setTeamMembershipAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const parsed = parseInput(instructorTeamMembershipSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    await setTeamMembership(parsed.value);
    revalidateAdmin("/admin/instructors", "/sub/abouttch1", "/sub/abouttch2");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function removeTeamMembershipAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const parsed = parseInput(
      instructorTeamMembershipDeleteSchema,
      formEntries(formData),
    );
    if (!parsed.ok) return parsed.failure;

    await removeTeamMembership(parsed.value.instructorId, parsed.value.teamId);
    revalidateAdmin("/admin/instructors", "/sub/abouttch1", "/sub/abouttch2");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ */
/* AD-007 시간표·강좌 관리                                             */
/* ------------------------------------------------------------------ */

function courseUpsertInput(formData: FormData): Record<string, unknown> {
  const raw = formEntries(formData);
  return {
    ...raw,
    sectionTitle: raw.sectionTitle ?? null,
    gradeTitle: raw.gradeTitle ?? null,
    scheduleText: raw.scheduleText ?? null,
    startDate: toKstIso(raw.startDate, "date"),
    intakeOpen: readBoolean(raw, "intakeOpen"),
  };
}

export async function createCourseAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const parsed = parseInput(courseUpsertSchema, courseUpsertInput(formData));
    if (!parsed.ok) return parsed.failure;

    await createCourse(parsed.value);
    revalidateAdmin("/admin/courses", "/admin", "/sub/schedule.n", "/sub/schedule.g");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateCourseAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const courseId = cuidLikeIdSchema.safeParse(formData.get("courseId"));
    if (!courseId.success) return failure("강좌를 찾을 수 없습니다.");

    const parsed = parseInput(courseUpsertSchema, courseUpsertInput(formData));
    if (!parsed.ok) return parsed.failure;

    await updateCourse(courseId.data, parsed.value);
    revalidateAdmin("/admin/courses", "/sub/schedule.n", "/sub/schedule.g");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteCourseAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const courseId = cuidLikeIdSchema.safeParse(formData.get("courseId"));
    if (!courseId.success) return failure("강좌를 찾을 수 없습니다.");

    await deleteCourse(courseId.data);
    revalidateAdmin("/admin/courses", "/admin", "/sub/schedule.n", "/sub/schedule.g");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/** BZ-001 접수중/접수마감은 관리자가 직접 바꾼다. 정원 자동 마감은 없다. (Q-ADM-05) */
export async function setCourseIntakeAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const raw = formEntries(formData);
    const parsed = parseInput(courseIntakeChangeSchema, {
      ...raw,
      intakeOpen: readBoolean(raw, "intakeOpen"),
    });
    if (!parsed.ok) return parsed.failure;

    await setCourseIntake(parsed.value);
    revalidateAdmin("/admin/courses", "/sub/schedule.n", "/sub/schedule.g");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ */
/* AD-013 개인정보 관리                                                */
/* ------------------------------------------------------------------ */

/** 원문(마스킹 해제) 조회. 조회할 때마다 서버가 감사기록을 남긴다. */
export async function revealApplicationAction(
  formData: FormData,
): Promise<ActionResult<RevealedApplication>> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(applicationRevealSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    return success(await revealApplication(admin.id, parsed.value));
  } catch (error) {
    return toFailure(error);
  }
}

export async function updateRetentionSettingAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdminFromCookies();
    const raw = formEntries(formData);
    const parsed = parseInput(privacyRetentionSettingSchema, {
      ...raw,
      automaticPurgeEnabled: readBoolean(raw, "automaticPurgeEnabled"),
    });
    if (!parsed.ok) return parsed.failure;

    await updateRetentionSetting(admin.id, parsed.value);
    // 보유기간 문구는 공개 신청·예약 모달의 동의 안내에도 그대로 나온다. 관리자 화면만
    // 무효화하면 공개 화면이 옛 문구를 계속 보여 준다. (BZ-002, 독립 리뷰 B-1)
    revalidateAdmin("/admin/privacy", ...PUBLIC_CONSENT_PATHS);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/** 파기 대상 시각 설정. 여러 건을 체크박스로 한 번에 지정한다. (ASM-009) */
export async function setPurgeEligibilityAction(
  formData: FormData,
): Promise<ActionResult<{ updated: number }>> {
  try {
    const admin = await requireAdminFromCookies();
    const raw = formEntries(formData);
    const applicationIds = formData
      .getAll("applicationIds")
      .filter((value): value is string => typeof value === "string" && value !== "");

    const parsed = parseInput(purgeEligibilitySchema, {
      kind: raw.kind,
      applicationIds,
      purgeEligibleAt: toKstIso(raw.purgeEligibleAt, "datetime"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await setPurgeEligibility(admin.id, parsed.value);
    revalidateAdmin("/admin/applications", "/admin/privacy");
    return success({ updated: result.updated });
  } catch (error) {
    return toFailure(error);
  }
}

/** 파기 실행. `dryRun` 이면 건수만 센다. 실제 파기만 감사기록을 남긴다. */
export async function runPurgeAction(formData: FormData): Promise<
  ActionResult<{
    dryRun: boolean;
    courseApplications: number;
    eventReservations: number;
    consultationApplications: number;
    instructorApplications: number;
    smsSubscriptions: number;
    removedFiles: number;
  }>
> {
  try {
    const admin = await requireAdminFromCookies();
    const raw = formEntries(formData);
    // 값이 없으면 실제 파기가 아니라 미리 세기(dryRun)로 본다. 안전한 쪽이 기본값이다.
    const parsed = parseInput(purgeRunSchema, {
      dryRun: raw.dryRun === undefined ? true : readBoolean(raw, "dryRun"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await runPurge({
      actorUserId: admin.id,
      dryRun: parsed.value.dryRun,
    });
    revalidateAdmin("/admin/applications", "/admin/privacy");
    return success({
      dryRun: result.dryRun,
      courseApplications: result.courseApplications,
      eventReservations: result.eventReservations,
      consultationApplications: result.consultationApplications,
      instructorApplications: result.instructorApplications,
      smsSubscriptions: result.smsSubscriptions,
      removedFiles: result.removedFiles,
    });
  } catch (error) {
    return toFailure(error);
  }
}

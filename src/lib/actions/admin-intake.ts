"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import {
  consultationDeleteSchema,
  consultationStatusChangeSchema,
  consultationTypeUpsertSchema,
  cuidLikeIdSchema,
  instructorApplicationDeleteSchema,
  instructorApplicationStatusChangeSchema,
  instructorStatusOptionUpsertSchema,
  noticeDeleteSchema,
  noticeUpsertSchema,
  siteSettingsSchema,
  smsSubscriptionDeleteSchema,
} from "@/lib/contracts";
import {
  failure,
  formEntries,
  isNonEmptyString,
  parseInput,
  readUploadedFile,
  success,
  toFailure,
} from "@/lib/actions/internal";
import { requireAdminFromCookies } from "@/server/auth/server-component-session";
import {
  changeConsultationStatus,
  deactivateConsultationType,
  deleteConsultationApplications,
  revealConsultationApplication,
  upsertConsultationType,
  type RevealedConsultation,
} from "@/server/services/consultations";
import {
  changeInstructorApplicationStatus,
  deleteInstructorApplications,
  revealInstructorApplication,
  upsertInstructorStatusOption,
  type RevealedInstructorApplication,
} from "@/server/services/instructor-applications";
import {
  addNoticeAttachment,
  deleteNotices,
  removeNoticeAttachment,
  upsertNotice,
} from "@/server/services/notices-admin";
import {
  deleteSmsSubscriptions,
  revealSmsSubscription,
  type RevealedSmsSubscription,
} from "@/server/services/sms-subscriptions";
import { updateSiteSettings } from "@/server/services/settings";

/**
 * Phase 5 관리자 화면의 Server Action —
 * AD-009 입학진단·상담, AD-010 설명회 알림 신청, AD-011 강사 지원, AD-014 공지사항.
 *
 * 모든 동작이 **자기 안에서 다시** 관리자 권한을 확인한다. 레이아웃 가드만 믿지 않는다.
 * (BLUEPRINT 7장)
 */

function readIds(formData: FormData, field: string): string[] {
  return formData.getAll(field).filter(isNonEmptyString);
}

function readBoolean(raw: Record<string, string>, key: string): boolean {
  const value = raw[key];
  return value === "true" || value === "on" || value === "1";
}

function revalidateAdmin(...paths: string[]): void {
  for (const path of paths) {
    revalidatePath(path);
  }
}

/* ------------------------------------------------------------------ */
/* AD-009 입학진단 및 상담 신청관리                                     */
/* ------------------------------------------------------------------ */

export async function changeConsultationStatusAction(
  formData: FormData,
): Promise<ActionResult<{ updated: number }>> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(consultationStatusChangeSchema, {
      applicationIds: readIds(formData, "applicationIds"),
      status: formData.get("status"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await changeConsultationStatus(admin.id, parsed.value);
    revalidateAdmin("/admin/consultations", "/admin");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteConsultationsAction(
  formData: FormData,
): Promise<ActionResult<{ deleted: number }>> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(consultationDeleteSchema, {
      applicationIds: readIds(formData, "applicationIds"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await deleteConsultationApplications(admin.id, parsed.value);
    revalidateAdmin("/admin/consultations", "/admin");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

/** AD-013 원문 조회. 조회할 때마다 기록을 남긴다. */
export async function revealConsultationAction(
  formData: FormData,
): Promise<ActionResult<RevealedConsultation>> {
  try {
    const admin = await requireAdminFromCookies();
    const id = cuidLikeIdSchema.safeParse(formData.get("applicationId"));
    if (!id.success) return failure("신청을 찾을 수 없습니다.");

    return success(await revealConsultationApplication(admin.id, id.data));
  } catch (error) {
    return toFailure(error);
  }
}

export async function upsertConsultationTypeAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const raw = formEntries(formData);
    const parsed = parseInput(consultationTypeUpsertSchema, {
      ...raw,
      id: raw.id || undefined,
      isActive: readBoolean(raw, "isActive"),
    });
    if (!parsed.ok) return parsed.failure;

    await upsertConsultationType(parsed.value);
    revalidateAdmin("/admin/consultations", "/sub/abouttch3");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function deactivateConsultationTypeAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const id = cuidLikeIdSchema.safeParse(formData.get("id"));
    if (!id.success) return failure("상담 유형을 찾을 수 없습니다.");

    await deactivateConsultationType(id.data);
    revalidateAdmin("/admin/consultations", "/sub/abouttch3");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ */
/* AD-010 문자신청내역 (설명회 알림 신청)                               */
/* ------------------------------------------------------------------ */

export async function deleteSmsSubscriptionsAction(
  formData: FormData,
): Promise<ActionResult<{ deleted: number }>> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(smsSubscriptionDeleteSchema, {
      subscriptionIds: readIds(formData, "subscriptionIds"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await deleteSmsSubscriptions(admin.id, parsed.value);
    revalidateAdmin("/admin/sms-subscriptions", "/admin");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function revealSmsSubscriptionAction(
  formData: FormData,
): Promise<ActionResult<RevealedSmsSubscription>> {
  try {
    const admin = await requireAdminFromCookies();
    const id = cuidLikeIdSchema.safeParse(formData.get("subscriptionId"));
    if (!id.success) return failure("신청을 찾을 수 없습니다.");

    return success(await revealSmsSubscription(admin.id, id.data));
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ */
/* AD-011 강사지원관리                                                  */
/* ------------------------------------------------------------------ */

export async function changeInstructorApplicationStatusAction(
  formData: FormData,
): Promise<ActionResult<{ updated: number }>> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(instructorApplicationStatusChangeSchema, {
      applicationIds: readIds(formData, "applicationIds"),
      status: formData.get("status"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await changeInstructorApplicationStatus(admin.id, parsed.value);
    revalidateAdmin("/admin/instructor-applications", "/admin");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteInstructorApplicationsAction(
  formData: FormData,
): Promise<ActionResult<{ deleted: number; removedFiles: number }>> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(instructorApplicationDeleteSchema, {
      applicationIds: readIds(formData, "applicationIds"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await deleteInstructorApplications(admin.id, parsed.value);
    revalidateAdmin("/admin/instructor-applications", "/admin");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function revealInstructorApplicationAction(
  formData: FormData,
): Promise<ActionResult<RevealedInstructorApplication>> {
  try {
    const admin = await requireAdminFromCookies();
    const id = cuidLikeIdSchema.safeParse(formData.get("applicationId"));
    if (!id.success) return failure("지원서를 찾을 수 없습니다.");

    return success(await revealInstructorApplication(admin.id, id.data));
  } catch (error) {
    return toFailure(error);
  }
}

export async function upsertInstructorStatusOptionAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const raw = formEntries(formData);
    const parsed = parseInput(instructorStatusOptionUpsertSchema, {
      ...raw,
      id: raw.id || undefined,
      isActive: readBoolean(raw, "isActive"),
    });
    if (!parsed.ok) return parsed.failure;

    await upsertInstructorStatusOption(parsed.value);
    revalidateAdmin("/admin/instructor-applications");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ */
/* AD-014 공지사항 관리                                                 */
/* ------------------------------------------------------------------ */

export async function upsertNoticeAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminFromCookies();
    const raw = formEntries(formData);
    const parsed = parseInput(noticeUpsertSchema, {
      ...raw,
      id: raw.id || undefined,
      isPinned: readBoolean(raw, "isPinned"),
      // 비우면 게시 시각을 서비스가 정한다. 입력값은 한국 시간으로 본다.
      publishedAt: raw.publishedAt ? `${raw.publishedAt}:00+09:00` : null,
    });
    if (!parsed.ok) return parsed.failure;

    const result = await upsertNotice(parsed.value);
    revalidateAdmin("/admin/notices", "/notice", `/notice/${result.id}`);
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteNoticesAction(
  formData: FormData,
): Promise<ActionResult<{ deleted: number; removedFiles: number }>> {
  try {
    await requireAdminFromCookies();
    const parsed = parseInput(noticeDeleteSchema, {
      noticeIds: readIds(formData, "noticeIds"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await deleteNotices(parsed.value);
    revalidateAdmin("/admin/notices", "/notice");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function addNoticeAttachmentAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminFromCookies();
    const noticeId = cuidLikeIdSchema.safeParse(formData.get("noticeId"));
    if (!noticeId.success) return failure("공지를 찾을 수 없습니다.");

    const file = await readUploadedFile(formData.get("attachment"));
    if (!file) return failure("첨부할 파일을 선택해 주세요.");

    const result = await addNoticeAttachment(noticeId.data, file);
    revalidateAdmin("/admin/notices", `/notice/${noticeId.data}`);
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function removeNoticeAttachmentAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminFromCookies();
    const id = cuidLikeIdSchema.safeParse(formData.get("attachmentId"));
    if (!id.success) return failure("첨부파일을 찾을 수 없습니다.");

    await removeNoticeAttachment(id.data);
    revalidateAdmin("/admin/notices", "/notice");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ */
/* 사이트 설정 (진단 버튼 연결 대상·강사 모집 메뉴 노출·서류 용량)        */
/* ------------------------------------------------------------------ */

export async function updateSiteSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdminFromCookies();
    const raw = formEntries(formData);
    const parsed = parseInput(siteSettingsSchema, {
      ...raw,
      recruitMenuVisible: readBoolean(raw, "recruitMenuVisible"),
    });
    if (!parsed.ok) return parsed.failure;

    await updateSiteSettings(admin.id, parsed.value);
    // 설정이 바뀌면 버튼·메뉴를 쓰는 공개 화면도 다시 그린다.
    revalidateAdmin("/admin/settings", "/", "/sub/abouttch3", "/sub/Recruit");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

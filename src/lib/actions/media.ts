"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import {
  facilityPhotoDeleteSchema,
  facilityPhotoUpsertSchema,
  homeBannerDeleteSchema,
  homeBannerUpsertSchema,
  mediaAltUpdateSchema,
  mediaBulkDeleteSchema,
  mediaDeleteSchema,
  mediaFinalizeSchema,
  mediaHideSchema,
  mediaUploadTicketSchema,
  type MediaAssetRow,
  type MediaDeleteResult,
  type MediaUploadTicket,
} from "@/lib/contracts";
import {
  formEntries,
  isNonEmptyString,
  parseInput,
  success,
  toFailure,
} from "@/lib/actions/internal";
import { requireAdminFromCookies } from "@/server/auth/server-component-session";
import {
  createMediaUploadTicket,
  deleteMediaAsset,
  deleteMediaAssets,
  finalizeMediaUpload,
  registerLegacyMediaAssets,
  setMediaHidden,
  updateMediaAlt,
} from "@/server/services/media";
import {
  deleteFacilityPhoto,
  deleteHomeBanner,
  upsertFacilityPhoto,
  upsertHomeBanner,
} from "@/server/services/site-images";

/**
 * AD-015 이미지 관리 Server Action.
 *
 * 모든 동작이 **자기 안에서 다시** 관리자 권한을 확인한다. 레이아웃 가드만 믿지 않는다.
 * (BLUEPRINT 7장) 파일 바이트는 이 Action 들을 지나가지 않는다. 브라우저가 티켓으로
 * 저장소에 직접 올리고, 서버는 저장된 것을 읽어 검사한다. (ADR-008)
 */

/** 사진이 바뀌면 그 사진을 쓰는 공개 화면도 다시 그린다. */
const PUBLIC_IMAGE_PATHS = [
  "/",
  "/sub/Facility",
  "/sub/abouttch1",
  "/sub/abouttch2",
] as const;

function revalidateAll(...extra: string[]): void {
  for (const path of [...PUBLIC_IMAGE_PATHS, ...extra]) {
    revalidatePath(path);
  }
}

function readBoolean(raw: Record<string, string>, key: string): boolean {
  const value = raw[key];
  return value === "true" || value === "on" || value === "1";
}

/* ------------------------------------------------------------------ *
 * 올리기 — 1단계 티켓, 2단계 마무리
 * ------------------------------------------------------------------ */

export async function requestMediaUploadTicketAction(
  formData: FormData,
): Promise<ActionResult<MediaUploadTicket>> {
  try {
    await requireAdminFromCookies();
    const parsed = parseInput(mediaUploadTicketSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    return success(await createMediaUploadTicket(parsed.value));
  } catch (error) {
    return toFailure(error);
  }
}

export async function finalizeMediaUploadAction(
  formData: FormData,
): Promise<ActionResult<MediaAssetRow>> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(mediaFinalizeSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    const row = await finalizeMediaUpload(admin.id, parsed.value);
    revalidatePath("/admin/media");
    return success(row);
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ *
 * 보관함 — 대체 텍스트 수정 · 삭제 · 숨기기 · 레거시 등록
 * ------------------------------------------------------------------ */

export async function updateMediaAltAction(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(mediaAltUpdateSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    await updateMediaAlt(admin.id, parsed.value);
    // 대체 텍스트는 공개 화면에 그대로 나간다.
    revalidateAll("/admin/media");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteMediaAssetAction(
  formData: FormData,
): Promise<ActionResult<{ removedFile: boolean }>> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(mediaDeleteSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    const result = await deleteMediaAsset(admin.id, parsed.value);
    revalidatePath("/admin/media");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * 고른 사진 여러 장을 지운다.
 *
 * 한 장이 막혀도 나머지는 지운다. 지운 것과 남긴 것을 함께 돌려주므로 화면이
 * 「2장 지웠고 1장은 쓰는 중이라 남겼습니다」처럼 결과를 그대로 알려 줄 수 있다.
 */
export async function deleteMediaAssetsAction(
  formData: FormData,
): Promise<ActionResult<MediaDeleteResult>> {
  try {
    const admin = await requireAdminFromCookies();
    // 체크박스는 같은 이름으로 여러 값을 보낸다. 평평한 맵으로는 하나만 남아 못 쓴다.
    const mediaIds = formData.getAll("mediaIds").filter(isNonEmptyString);

    const parsed = parseInput(mediaBulkDeleteSchema, { mediaIds });
    if (!parsed.ok) return parsed.failure;

    const result = await deleteMediaAssets(admin.id, parsed.value);
    revalidatePath("/admin/media");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * 사진을 보관함에서 숨기거나 다시 보이게 한다.
 *
 * 기존 사이트 사진은 배포된 파일을 실행 중에 지울 수 없어 이 길로 목록·고르기 상자에서
 * 뺀다. 올린 사진도 지우지 않고 치워 둘 수 있다. (AD-015)
 */
export async function setMediaHiddenAction(
  formData: FormData,
): Promise<ActionResult<{ hidden: boolean }>> {
  try {
    const admin = await requireAdminFromCookies();
    const raw = formEntries(formData);
    const parsed = parseInput(mediaHideSchema, {
      mediaId: raw.mediaId,
      hidden: readBoolean(raw, "hidden"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await setMediaHidden(admin.id, parsed.value);
    // 숨긴 사진은 고르기 상자에서도 빠진다. 사진을 고르는 관리자 화면을 함께 다시 그린다.
    revalidatePath("/admin/media");
    revalidatePath("/admin/media/banners");
    revalidatePath("/admin/media/facility");
    revalidatePath("/admin/instructors");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

/** 레거시에서 가져와 `public/` 에 커밋한 사진을 보관함에 넣는다. 여러 번 눌러도 안전하다. */
export async function registerLegacyMediaAction(): Promise<
  ActionResult<{ created: number; existing: number }>
> {
  try {
    await requireAdminFromCookies();
    const result = await registerLegacyMediaAssets();
    revalidatePath("/admin/media");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ *
 * 메인 배너
 * ------------------------------------------------------------------ */

export async function upsertHomeBannerAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdminFromCookies();
    const raw = formEntries(formData);
    const parsed = parseInput(homeBannerUpsertSchema, {
      ...raw,
      id: raw.id || undefined,
      mediaId: raw.mediaId || null,
      isVisible: readBoolean(raw, "isVisible"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await upsertHomeBanner(admin.id, parsed.value);
    revalidateAll("/admin/media/banners");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteHomeBannerAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(homeBannerDeleteSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    await deleteHomeBanner(admin.id, parsed.value.bannerId);
    revalidateAll("/admin/media/banners");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/* ------------------------------------------------------------------ *
 * 시설안내 사진
 * ------------------------------------------------------------------ */

export async function upsertFacilityPhotoAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdminFromCookies();
    const raw = formEntries(formData);
    const parsed = parseInput(facilityPhotoUpsertSchema, {
      ...raw,
      id: raw.id || undefined,
      isVisible: readBoolean(raw, "isVisible"),
    });
    if (!parsed.ok) return parsed.failure;

    const result = await upsertFacilityPhoto(admin.id, parsed.value);
    revalidateAll("/admin/media/facility");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteFacilityPhotoAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdminFromCookies();
    const parsed = parseInput(facilityPhotoDeleteSchema, formEntries(formData));
    if (!parsed.ok) return parsed.failure;

    await deleteFacilityPhoto(admin.id, parsed.value.photoId);
    revalidateAll("/admin/media/facility");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

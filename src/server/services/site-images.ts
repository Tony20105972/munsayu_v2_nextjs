import "server-only";
import {
  type AdminFacilityPhotoRow,
  type AdminHomeBannerRow,
  type FacilityCampusKey,
  type FacilityPhotoUpsertInput,
  type HomeBannerUpsertInput,
} from "@/lib/contracts";
import {
  DEFAULT_FACILITY_PHOTOS,
  DEFAULT_HOME_BANNERS,
  type FacilityPhotoView,
  type HomeBannerView,
} from "@/lib/images";
import { db } from "@/server/db";
import { notFound } from "@/server/errors";
import { assertMediaExists, logMediaAttachment } from "@/server/services/media";

/**
 * AD-015 화면에 붙는 사진·배너 관리.
 *
 * 공개 화면은 **DB 를 읽지 못하거나 행이 없어도 멈추지 않는다.** 그럴 때는
 * `src/lib/images.ts` 의 코드 기본값으로 그린다. Phase 3 화면과 같은 모양이 나온다.
 */

/* ------------------------------------------------------------------ *
 * 메인 배너 (PG-001)
 * ------------------------------------------------------------------ */

export async function listAdminHomeBanners(): Promise<AdminHomeBannerRow[]> {
  const rows = await db.homeBanner.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: { media: { select: { url: true, alt: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    mediaId: row.mediaId,
    mediaUrl: row.media?.url ?? null,
    mediaAlt: row.media?.alt ?? null,
    eyebrow: row.eyebrow,
    headline: row.headline,
    body: row.body,
    primaryLabel: row.primaryLabel ?? "",
    primaryHref: row.primaryHref ?? "",
    secondaryLabel: row.secondaryLabel ?? "",
    secondaryHref: row.secondaryHref ?? "",
    displayOrder: row.displayOrder,
    isVisible: row.isVisible,
  }));
}

export async function upsertHomeBanner(
  actorUserId: string,
  input: HomeBannerUpsertInput,
): Promise<{ id: string }> {
  if (input.mediaId) await assertMediaExists(input.mediaId);

  const data = {
    mediaId: input.mediaId,
    eyebrow: input.eyebrow,
    headline: input.headline,
    body: input.body,
    // 문구나 주소 한쪽만 있으면 버튼을 그리지 않는다. 빈 값은 null 로 모아 둔다.
    primaryLabel: input.primaryLabel || null,
    primaryHref: input.primaryHref || null,
    secondaryLabel: input.secondaryLabel || null,
    secondaryHref: input.secondaryHref || null,
    displayOrder: input.displayOrder,
    isVisible: input.isVisible,
  };

  const row = input.id
    ? await db.homeBanner.update({
        where: { id: input.id },
        data,
        select: { id: true },
      })
    : await db.homeBanner.create({ data, select: { id: true } });

  await logMediaAttachment(actorUserId, {
    resourceType: "HomeBanner",
    resourceId: row.id,
    mediaId: input.mediaId,
  });

  return row;
}

export async function deleteHomeBanner(
  actorUserId: string,
  bannerId: string,
): Promise<void> {
  const existing = await db.homeBanner.findUnique({
    where: { id: bannerId },
    select: { id: true },
  });
  if (!existing) throw notFound();

  await db.homeBanner.delete({ where: { id: bannerId } });
  await logMediaAttachment(actorUserId, {
    resourceType: "HomeBanner",
    resourceId: bannerId,
    mediaId: null,
  });
}

/**
 * 공개 홈이 쓰는 배너 목록. 노출로 켠 것만 순서대로 돌려준다.
 * 행이 없거나 DB 를 읽지 못하면 코드 기본값 3장을 쓴다.
 */
export async function loadHomeBannerViews(): Promise<readonly HomeBannerView[]> {
  try {
    const rows = await db.homeBanner.findMany({
      where: { isVisible: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: { media: { select: { url: true } } },
    });

    if (rows.length === 0) return DEFAULT_HOME_BANNERS;

    return rows.map((row) => ({
      id: row.id,
      backgroundUrl: row.media?.url ?? null,
      eyebrow: row.eyebrow,
      headline: row.headline,
      body: row.body,
      primaryLabel: row.primaryLabel ?? "",
      primaryHref: row.primaryHref ?? "",
      secondaryLabel: row.secondaryLabel ?? "",
      secondaryHref: row.secondaryHref ?? "",
    }));
  } catch (error) {
    // 홈 전체가 멈추는 것보다 기본 배너를 보여 주는 것이 낫다. (AD-015 복원력)
    console.error("home_banner_load_failed", {
      name: error instanceof Error ? error.name : "Unknown",
    });
    return DEFAULT_HOME_BANNERS;
  }
}

/* ------------------------------------------------------------------ *
 * 시설안내 사진 (PG-004)
 * ------------------------------------------------------------------ */

export async function listAdminFacilityPhotos(): Promise<AdminFacilityPhotoRow[]> {
  const rows = await db.facilityPhoto.findMany({
    orderBy: [{ campusKey: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    include: { media: { select: { url: true, alt: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    campusKey: row.campusKey as FacilityCampusKey,
    mediaId: row.mediaId,
    mediaUrl: row.media.url,
    mediaAlt: row.media.alt,
    caption: row.caption,
    displayOrder: row.displayOrder,
    isVisible: row.isVisible,
  }));
}

export async function upsertFacilityPhoto(
  actorUserId: string,
  input: FacilityPhotoUpsertInput,
): Promise<{ id: string }> {
  await assertMediaExists(input.mediaId);

  const data = {
    campusKey: input.campusKey,
    mediaId: input.mediaId,
    caption: input.caption,
    displayOrder: input.displayOrder,
    isVisible: input.isVisible,
  };

  const row = input.id
    ? await db.facilityPhoto.update({
        where: { id: input.id },
        data,
        select: { id: true },
      })
    : await db.facilityPhoto.create({ data, select: { id: true } });

  await logMediaAttachment(actorUserId, {
    resourceType: "FacilityPhoto",
    resourceId: row.id,
    mediaId: input.mediaId,
  });

  return row;
}

export async function deleteFacilityPhoto(
  actorUserId: string,
  photoId: string,
): Promise<void> {
  const existing = await db.facilityPhoto.findUnique({
    where: { id: photoId },
    select: { id: true },
  });
  if (!existing) throw notFound();

  await db.facilityPhoto.delete({ where: { id: photoId } });
  await logMediaAttachment(actorUserId, {
    resourceType: "FacilityPhoto",
    resourceId: photoId,
    mediaId: null,
  });
}

/**
 * 공개 시설안내가 쓰는 지점별 사진. 행이 없거나 DB 를 읽지 못하면
 * 지금 커밋돼 있는 사진 4장을 쓴다.
 */
export async function loadFacilityPhotoViews(
  campusKey: FacilityCampusKey,
): Promise<readonly FacilityPhotoView[]> {
  try {
    const rows = await db.facilityPhoto.findMany({
      where: { campusKey, isVisible: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: { media: { select: { url: true } } },
    });

    if (rows.length === 0) return DEFAULT_FACILITY_PHOTOS[campusKey] ?? [];

    return rows.map((row) => ({
      id: row.id,
      url: row.media.url,
      caption: row.caption,
    }));
  } catch (error) {
    console.error("facility_photo_load_failed", {
      name: error instanceof Error ? error.name : "Unknown",
    });
    return DEFAULT_FACILITY_PHOTOS[campusKey] ?? [];
  }
}

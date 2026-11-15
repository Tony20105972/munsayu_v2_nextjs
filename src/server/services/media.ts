import "server-only";
import type { MediaAsset, Prisma } from "@prisma/client";
import {
  MEDIA_MESSAGES,
  MEDIA_UPLOAD_MAX_BYTES_DEFAULT,
  mediaFinalizeSchema,
  type MediaAltUpdateInput,
  type MediaAssetList,
  type MediaAssetRow,
  type MediaBulkDeleteInput,
  type MediaDeleteBlocked,
  type MediaDeleteInput,
  type MediaDeleteResult,
  type MediaFinalizeInput,
  type MediaHideInput,
  type MediaListInput,
  type MediaUploadTicket,
  type MediaUploadTicketInput,
  type MediaUsagePlace,
} from "@/lib/contracts";
import { toFieldErrors } from "@/lib/form-errors";
import { LEGACY_MEDIA_REGISTRY } from "@/lib/legacy-media-registry";
import {
  createStorageKey,
  getStorageAdapter,
  hashContent,
} from "@/server/adapters/storage";
import { db } from "@/server/db";
import { conflict, notFound, validationFailed } from "@/server/errors";
import { normalizeUploadedImage } from "@/server/lib/image-pipeline";
import { writeAuditLog } from "@/server/services/audit";
import { getSiteSettings } from "@/server/services/settings";

/**
 * AD-015 이미지 보관함.
 *
 * 공개 화면이 쓰는 이미지는 모두 이 표를 거친다. 보관함에는 개인정보가 들어오지 않는다.
 * 신청 서류(이력서)는 비공개 영역에 있고 여기로 올라오지 않는다. (AD-011)
 *
 * 올리기는 두 걸음이다.
 *  1. `createMediaUploadTicket` — 서버가 임시 저장 자리와 서명된 티켓을 내준다.
 *  2. 브라우저가 저장소로 바이트를 직접 보낸다. (Vercel 함수 본문 상한 4.5MB 회피)
 *  3. `finalizeMediaUpload` — 서버가 임시 저장본을 **다시** 검사·변환해 본 자리에 넣는다.
 *
 * 2번을 건너뛰고 1·3번만 불러도 임시 저장본이 없어 실패한다. 검사는 항상 서버에서 한다.
 */

/** 임시 저장 자리의 키 앞머리. 검사 전 원본만 여기 머문다. */
const STAGING_PREFIX = "media-staging";

/** 본 저장 자리의 키 앞머리. */
const MEDIA_PREFIX = "media";

export async function getMediaUploadMaxBytes(): Promise<number> {
  try {
    return (await getSiteSettings()).mediaMaxUploadBytes;
  } catch {
    // 설정을 못 읽어도 올리기 자체는 되게 한다. 기본 상한을 쓴다. (AD-015 복원력)
    return MEDIA_UPLOAD_MAX_BYTES_DEFAULT;
  }
}

export async function createMediaUploadTicket(
  input: MediaUploadTicketInput,
): Promise<MediaUploadTicket> {
  const maxBytes = await getMediaUploadMaxBytes();

  // 브라우저가 알려 준 크기는 믿지 않지만, 뻔히 큰 파일은 올리기 전에 돌려보낸다.
  if (input.sizeBytes > maxBytes) {
    throw validationFailed({ image: [MEDIA_MESSAGES.tooLarge(maxBytes)] });
  }

  // 확장자는 믿지 않으므로 임시 키에는 확장자를 붙이지 않는다.
  const stagingKey = createStorageKey(STAGING_PREFIX, "");
  const ticket = await getStorageAdapter().createUploadTicket("staging", stagingKey, {
    maxBytes,
  });

  return {
    url: ticket.url,
    method: ticket.method,
    headers: ticket.headers,
    stagingKey: ticket.key,
    maxBytes: ticket.maxBytes,
    expiresAt: ticket.expiresAt.toISOString(),
  };
}

/**
 * 올린 임시 저장본을 검사·변환해 보관함에 등록한다.
 *
 * 임시 저장본은 성공이든 실패든 지운다. 올린 원본은 보관하지 않는다.
 */
export async function finalizeMediaUpload(
  actorUserId: string,
  rawInput: MediaFinalizeInput,
): Promise<MediaAssetRow> {
  /*
   * 대체 텍스트가 비어 있으면 보관함에 넣지 않는다. 이것은 입력 형식이 아니라
   * 보관함의 규칙이라 부르는 쪽을 믿지 않고 서비스에서 한 번 더 확인한다.
   * (화면·Action 도 같은 스키마로 먼저 검증한다)
   */
  const parsedInput = mediaFinalizeSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    throw validationFailed(toFieldErrors(parsedInput.error));
  }
  const input = parsedInput.data;

  if (!input.stagingKey.startsWith(`${STAGING_PREFIX}/`)) {
    throw validationFailed({
      image: ["올린 사진을 찾을 수 없습니다. 다시 올려 주세요."],
    });
  }

  const storage = getStorageAdapter();
  const raw = await storage.get("staging", input.stagingKey).catch(() => null);
  if (!raw) {
    throw validationFailed({
      image: ["올린 사진을 찾을 수 없습니다. 다시 올려 주세요."],
    });
  }

  try {
    const maxBytes = await getMediaUploadMaxBytes();
    const normalized = await normalizeUploadedImage(raw, { maxBytes });

    const key = createStorageKey(MEDIA_PREFIX, normalized.format);
    const stored = await storage.put(
      "public",
      key,
      normalized.bytes,
      normalized.contentType,
    );
    if (!stored.url) {
      throw new Error("MEDIA_PUBLIC_URL_MISSING");
    }

    const created = await db.mediaAsset.create({
      data: {
        source: "UPLOAD",
        storageKey: key,
        url: stored.url,
        filename: input.filename.slice(0, 200),
        alt: input.alt,
        contentType: normalized.contentType,
        sizeBytes: normalized.bytes.byteLength,
        width: normalized.width,
        height: normalized.height,
        contentHash: hashContent(normalized.bytes),
        uploadedByUserId: actorUserId,
      },
    });

    // 누가 언제 올렸는지 남긴다. 파일 이름은 넣지 않는다. (AD-013)
    await writeAuditLog({
      actorUserId,
      action: "MEDIA_UPLOAD",
      resourceType: "MediaAsset",
      resourceId: created.id,
      filterSummary: `format=${normalized.format};bytes=${normalized.bytes.byteLength};converted=${normalized.converted}`,
    });

    return toRow(created, []);
  } finally {
    // 검사 전 원본은 남겨 두지 않는다.
    await storage.remove("staging", input.stagingKey).catch(() => undefined);
  }
}

/* ------------------------------------------------------------------ *
 * 화면에 사진을 붙일 때 쓰는 도구
 * ------------------------------------------------------------------ */

/**
 * 지정한 보관함 사진이 실제로 있는지 본다.
 * 없는 id 를 그냥 저장하면 외래 키 오류가 500 으로 새어 나간다.
 */
export async function assertMediaExists(mediaId: string): Promise<void> {
  const media = await db.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { id: true, hiddenAt: true },
  });
  if (!media) {
    throw validationFailed({ mediaId: ["보관함에서 사진을 찾을 수 없습니다."] });
  }
  // 숨긴 사진은 고르기 상자에 없다. 주소를 직접 보내도 붙지 않게 막는다.
  if (media.hiddenAt) {
    throw validationFailed({ mediaId: [MEDIA_MESSAGES.hidden] });
  }
}

/** 화면에 사진을 붙이거나 바꾼 것도 감사 기록에 남긴다. 파일 이름은 넣지 않는다. (AD-013) */
export async function logMediaAttachment(
  actorUserId: string,
  params: { resourceType: string; resourceId: string; mediaId: string | null },
): Promise<void> {
  await writeAuditLog({
    actorUserId,
    action: "MEDIA_UPDATE",
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    filterSummary: `mediaId=${params.mediaId ?? "none"}`,
  });
}

/* ------------------------------------------------------------------ *
 * 쓰이는 자리 찾기 — 삭제를 막고 어디에 쓰는지 보여 준다
 * ------------------------------------------------------------------ */

const CAMPUS_LABELS: Record<string, string> = {
  daechi: "대치본원",
  bundang: "분당점",
};

/**
 * 사진이 쓰이고 있는 자리를 모아 온다. 참조하는 표를 직접 보기 때문에
 * 따로 관리하는 사용 기록과 어긋날 일이 없다.
 *
 * 공지 본문은 HTML 안에 주소가 들어가므로 본문에서 주소를 찾는다.
 */
export async function findMediaUsages(
  assets: ReadonlyArray<{ id: string; url: string }>,
): Promise<Map<string, MediaUsagePlace[]>> {
  const result = new Map<string, MediaUsagePlace[]>();
  for (const asset of assets) result.set(asset.id, []);
  if (assets.length === 0) return result;

  const ids = assets.map((asset) => asset.id);

  const [instructors, banners, facilityPhotos, notices] = await Promise.all([
    db.instructor.findMany({
      where: { photoMediaId: { in: ids } },
      select: { name: true, photoMediaId: true },
    }),
    db.homeBanner.findMany({
      where: { mediaId: { in: ids } },
      select: { headline: true, mediaId: true },
    }),
    db.facilityPhoto.findMany({
      where: { mediaId: { in: ids } },
      select: { campusKey: true, displayOrder: true, mediaId: true },
    }),
    db.notice.findMany({
      where: { OR: assets.map((asset) => ({ body: { contains: asset.url } })) },
      select: { id: true, title: true, body: true },
    }),
  ]);

  function add(mediaId: string | null, place: MediaUsagePlace): void {
    if (!mediaId) return;
    result.get(mediaId)?.push(place);
  }

  for (const instructor of instructors) {
    add(instructor.photoMediaId, {
      area: "강사 사진",
      label: instructor.name,
      adminHref: "/admin/instructors",
    });
  }
  for (const banner of banners) {
    add(banner.mediaId, {
      area: "메인 배너",
      label: banner.headline,
      adminHref: "/admin/media/banners",
    });
  }
  for (const photo of facilityPhotos) {
    add(photo.mediaId, {
      area: "시설안내 사진",
      label: `${CAMPUS_LABELS[photo.campusKey] ?? photo.campusKey} ${photo.displayOrder}번`,
      adminHref: "/admin/media/facility",
    });
  }
  for (const notice of notices) {
    for (const asset of assets) {
      if (notice.body.includes(asset.url)) {
        add(asset.id, {
          area: "공지 본문",
          label: notice.title,
          adminHref: `/admin/notices/${notice.id}`,
        });
      }
    }
  }

  return result;
}

function toRow(asset: MediaAsset, usages: MediaUsagePlace[]): MediaAssetRow {
  return {
    id: asset.id,
    source: asset.source,
    url: asset.url,
    filename: asset.filename,
    alt: asset.alt,
    contentType: asset.contentType,
    sizeBytes: asset.sizeBytes,
    width: asset.width,
    height: asset.height,
    rightsNote: asset.rightsNote,
    replaceRecommended: asset.replaceRecommended,
    uploadedAt: asset.createdAt.toISOString(),
    hidden: asset.hiddenAt !== null,
    hiddenAt: asset.hiddenAt?.toISOString() ?? null,
    usages,
  };
}

/* ------------------------------------------------------------------ *
 * 목록 · 수정 · 삭제
 * ------------------------------------------------------------------ */

export async function listMediaAssets(filter: MediaListInput): Promise<MediaAssetList> {
  const where: Prisma.MediaAssetWhereInput = {
    // 숨긴 사진은 기본 목록에서 빠진다. 「숨긴 사진」을 골랐을 때만 모아 보여 준다.
    hiddenAt: filter.visibility === "hidden" ? { not: null } : null,
    ...(filter.source ? { source: filter.source } : {}),
    ...(filter.keyword
      ? {
          OR: [
            { filename: { contains: filter.keyword, mode: "insensitive" } },
            { alt: { contains: filter.keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // `usage` 는 참조하는 표를 봐야 알 수 있어 DB 조건으로 만들 수 없다.
  // 조건이 없을 때는 DB 쪽수 나누기를 그대로 쓰고, 조건이 있을 때만 모아서 고른다.
  if (!filter.usage) {
    const [total, rows, counts] = await Promise.all([
      db.mediaAsset.count({ where }),
      db.mediaAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      summarizeLibrary(),
    ]);

    const usages = await findMediaUsages(rows);
    return {
      items: rows.map((row) => toRow(row, usages.get(row.id) ?? [])),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
      counts,
    };
  }

  const rows = await db.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" } });
  const usages = await findMediaUsages(rows);
  const wantUsed = filter.usage === "used";
  const matched = rows.filter(
    (row) => (usages.get(row.id) ?? []).length > 0 === wantUsed,
  );

  const start = (filter.page - 1) * filter.pageSize;
  return {
    items: matched
      .slice(start, start + filter.pageSize)
      .map((row) => toRow(row, usages.get(row.id) ?? [])),
    total: matched.length,
    page: filter.page,
    pageSize: filter.pageSize,
    counts: await summarizeLibrary(),
  };
}

/** 보관함 전체 요약. 숨김 수를 뺀 나머지는 보이는 사진만 센다. */
async function summarizeLibrary(): Promise<MediaAssetList["counts"]> {
  const visible = { hiddenAt: null } as const;
  const [total, uploaded, legacy, replaceRecommended, hidden] = await Promise.all([
    db.mediaAsset.count({ where: visible }),
    db.mediaAsset.count({ where: { ...visible, source: "UPLOAD" } }),
    db.mediaAsset.count({ where: { ...visible, source: "LEGACY" } }),
    db.mediaAsset.count({ where: { ...visible, replaceRecommended: true } }),
    db.mediaAsset.count({ where: { hiddenAt: { not: null } } }),
  ]);
  return { total, uploaded, legacy, replaceRecommended, hidden };
}

/** 고르기 상자에 넣는 가벼운 목록. 썸네일 주소까지만 돌려준다. */
export type MediaOption = {
  id: string;
  url: string;
  alt: string;
  filename: string;
  replaceRecommended: boolean;
};

export async function listMediaOptions(limit = 300): Promise<MediaOption[]> {
  const rows = await db.mediaAsset.findMany({
    // 숨긴 사진은 고르기 상자에 넣지 않는다. (AD-015)
    where: { hiddenAt: null },
    orderBy: [{ source: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      url: true,
      alt: true,
      filename: true,
      replaceRecommended: true,
    },
  });
  return rows;
}

export async function updateMediaAlt(
  actorUserId: string,
  input: MediaAltUpdateInput,
): Promise<void> {
  const existing = await db.mediaAsset.findUnique({
    where: { id: input.mediaId },
    select: { id: true },
  });
  if (!existing) throw notFound();

  await db.mediaAsset.update({
    where: { id: input.mediaId },
    data: { alt: input.alt },
  });

  await writeAuditLog({
    actorUserId,
    action: "MEDIA_UPDATE",
    resourceType: "MediaAsset",
    resourceId: input.mediaId,
    filterSummary: "field=alt",
  });
}

/** 쓰는 자리를 문구 한 줄로 만든다. 너무 길어지지 않게 다섯 곳까지만 적는다. */
function describeUsages(usages: readonly MediaUsagePlace[]): string {
  return usages
    .slice(0, 5)
    .map((usage) => `${usage.area} — ${usage.label}`)
    .join(", ");
}

/**
 * 보관함에서 사진을 지운다. 한 장이든 여러 장이든 이 함수를 쓴다.
 *
 * 지우지 않는 경우가 둘 있다.
 *  - 화면에서 쓰는 중: 어디에 쓰는지(화면 이름과 항목) 돌려준다. 먼저 그 화면에서 빼야 한다.
 *  - 기존 사이트 사진(`LEGACY`): 파일이 저장소가 아니라 `public/` 에 커밋돼 있어
 *    실행 중에 지울 수 없다(배포 환경은 파일을 바꾸지 못한다). 「숨기기」로 처리한다.
 *
 * 올린 사진은 **파일을 먼저 지우고 그 다음 기록을 지운다.** 둘을 한 트랜잭션에 묶어
 * 파일 삭제가 실패하면 기록도 되돌린다 — 보이지 않는 파일이 저장소에 남는 것보다
 * 목록에 남아 다시 지울 수 있는 것이 낫다.
 *
 * 여러 장을 고른 경우 한 장이 막혀도 나머지는 지운다. 결과에 지운 것과 막힌 것을 함께 담는다.
 */
export async function deleteMediaAssets(
  actorUserId: string,
  input: MediaBulkDeleteInput,
): Promise<MediaDeleteResult> {
  const assets = await db.mediaAsset.findMany({ where: { id: { in: input.mediaIds } } });
  const found = new Map(assets.map((asset) => [asset.id, asset]));
  const usageMap = await findMediaUsages(assets);

  const deleted: MediaDeleteResult["deleted"] = [];
  const blocked: MediaDeleteBlocked[] = [];

  for (const mediaId of input.mediaIds) {
    const asset = found.get(mediaId);
    if (!asset) {
      blocked.push({ id: mediaId, filename: "", reason: "missing", usages: [] });
      continue;
    }

    const usages = usageMap.get(asset.id) ?? [];
    if (usages.length > 0) {
      blocked.push({
        id: asset.id,
        filename: asset.filename,
        reason: "in-use",
        usages,
      });
      continue;
    }

    if (asset.source === "LEGACY") {
      blocked.push({
        id: asset.id,
        filename: asset.filename,
        reason: "legacy",
        usages: [],
      });
      continue;
    }

    try {
      await db.$transaction(async (tx) => {
        await tx.mediaAsset.delete({ where: { id: asset.id } });
        if (asset.storageKey) {
          // 저장소에서 지우다 실패하면 예외가 올라가 위의 기록 삭제까지 되돌아간다.
          await getStorageAdapter().remove("public", asset.storageKey);
        }
      });
    } catch {
      blocked.push({
        id: asset.id,
        filename: asset.filename,
        reason: "file",
        usages: [],
      });
      continue;
    }

    deleted.push({ id: asset.id, filename: asset.filename });

    // 누가 언제 무엇을 지웠는지 남긴다. 파일 이름은 넣지 않는다. (AD-013)
    await writeAuditLog({
      actorUserId,
      action: "MEDIA_DELETE",
      resourceType: "MediaAsset",
      resourceId: asset.id,
      filterSummary: `source=${asset.source};removedFile=true`,
    });
  }

  return { deleted, blocked };
}

/**
 * 한 장만 지운다. 막히면 이유를 문구로 만들어 예외로 던진다 —
 * 화면의 확인 창이 그 문구를 그대로 보여 준다.
 */
export async function deleteMediaAsset(
  actorUserId: string,
  input: MediaDeleteInput,
): Promise<{ removedFile: boolean }> {
  const result = await deleteMediaAssets(actorUserId, { mediaIds: [input.mediaId] });
  if (result.deleted.length === 1) return { removedFile: true };

  const [failure] = result.blocked;
  switch (failure?.reason) {
    case "in-use":
      throw conflict(
        `${MEDIA_MESSAGES.inUse} (쓰는 곳: ${describeUsages(failure.usages)})`,
      );
    case "legacy":
      throw conflict(MEDIA_MESSAGES.legacyDeleteBlocked);
    case "file":
      throw conflict(
        "저장된 사진 파일을 지우지 못했습니다. 보관함 기록은 그대로 두었습니다. 잠시 후 다시 시도해 주세요.",
      );
    default:
      throw notFound();
  }
}

/**
 * 사진을 보관함에서 숨기거나 다시 보이게 한다.
 *
 * 기존 사이트 사진은 지울 수 없어 이 길로 목록·고르기 상자에서 뺀다. 올린 사진도
 * 지우지 않고 잠시 치워 둘 수 있다. 쓰는 중인 사진은 숨기지 않는다 — 공개 화면은
 * 그대로 그 사진을 쓰는데 보관함에서는 사라져 찾을 수 없게 되기 때문이다.
 */
export async function setMediaHidden(
  actorUserId: string,
  input: MediaHideInput,
): Promise<{ hidden: boolean }> {
  const asset = await db.mediaAsset.findUnique({ where: { id: input.mediaId } });
  if (!asset) throw notFound();

  if (input.hidden) {
    const usages = (await findMediaUsages([asset])).get(asset.id) ?? [];
    if (usages.length > 0) {
      throw conflict(
        `${MEDIA_MESSAGES.hideInUse} (쓰는 곳: ${describeUsages(usages)})`,
      );
    }
  }

  // 이미 그 상태면 기록만 늘리지 않고 그대로 둔다.
  if ((asset.hiddenAt !== null) === input.hidden) {
    return { hidden: input.hidden };
  }

  await db.mediaAsset.update({
    where: { id: asset.id },
    data: input.hidden
      ? { hiddenAt: new Date(), hiddenByUserId: actorUserId }
      : { hiddenAt: null, hiddenByUserId: null },
  });

  await writeAuditLog({
    actorUserId,
    action: input.hidden ? "MEDIA_HIDE" : "MEDIA_UNHIDE",
    resourceType: "MediaAsset",
    resourceId: asset.id,
    filterSummary: `source=${asset.source}`,
  });

  return { hidden: input.hidden };
}

/* ------------------------------------------------------------------ *
 * 레거시 커밋 이미지 등록
 * ------------------------------------------------------------------ */

/**
 * 레거시에서 받아 `public/images/` 에 커밋한 이미지를 보관함에 등록한다.
 * 화면에서 한 장씩 새 사진으로 바꿀 수 있게 하는 것이 목적이다.
 *
 * 목록은 커밋된 등록부(`src/lib/legacy-media-registry.ts`)에서 읽는다.
 * 파일 시스템을 읽지 않으므로 운영 함수에서도 그대로 돈다.
 * 같은 주소는 다시 만들지 않아 여러 번 실행해도 안전하다.
 */
export async function registerLegacyMediaAssets(): Promise<{
  created: number;
  existing: number;
}> {
  const existingRows = await db.mediaAsset.findMany({
    where: { url: { in: LEGACY_MEDIA_REGISTRY.map((entry) => entry.url) } },
    select: { url: true },
  });
  const known = new Set(existingRows.map((row) => row.url));

  const toCreate = LEGACY_MEDIA_REGISTRY.filter((entry) => !known.has(entry.url));
  if (toCreate.length > 0) {
    await db.mediaAsset.createMany({
      data: toCreate.map((entry) => ({
        source: "LEGACY" as const,
        storageKey: null,
        url: entry.url,
        filename: entry.filename,
        alt: entry.alt,
        contentType: entry.contentType,
        sizeBytes: entry.sizeBytes,
        width: entry.width,
        height: entry.height,
        rightsNote: entry.rightsNote,
        replaceRecommended: entry.replaceRecommended,
      })),
      skipDuplicates: true,
    });
  }

  return { created: toCreate.length, existing: known.size };
}

/** 레거시 등록본을 주소로 찾는다. 시드와 마이그레이션 보조에 쓴다. */
export async function findMediaIdByUrl(url: string): Promise<string | null> {
  const row = await db.mediaAsset.findUnique({ where: { url }, select: { id: true } });
  return row?.id ?? null;
}

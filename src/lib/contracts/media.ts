import { z } from "zod";
import { cuidLikeIdSchema, paginationSchema } from "./common";

/**
 * AD-015 이미지 관리의 공유 계약.
 *
 * 화면(파일 고르기·대체 텍스트 입력)과 서버(형식·용량·크기 검사)가 같은 값을 쓴다.
 * 형식 판별은 확장자가 아니라 **파일 내용**으로 하고, 그 구현은 서버에만 있다.
 * (`src/server/lib/file-format.ts`, `src/server/lib/image-pipeline.ts`)
 *
 * 설계 근거: docs/decisions/ADR-008-admin-media-upload.md
 */

/** 보관함에 저장하는 형식. SVG 는 스크립트를 담을 수 있어 넣지 않는다. */
export const MEDIA_IMAGE_FORMATS = ["jpeg", "png", "webp", "gif"] as const;
export type MediaImageFormat = (typeof MEDIA_IMAGE_FORMATS)[number];

export const MEDIA_CONTENT_TYPES: Record<MediaImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** 파일 고르기 대화상자에 넣는 값. 서버 검사를 대신하지 않는다. */
export const MEDIA_FILE_INPUT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

/** 올린 파일 용량 상한 기본값. 관리자 설정으로 바꿀 수 있다. */
export const MEDIA_UPLOAD_MAX_BYTES_DEFAULT = 20 * 1024 * 1024;

/** 저장할 때 줄이는 기준. 긴 변이 이 값을 넘으면 비율을 지켜 줄인다. */
export const MEDIA_MAX_LONG_EDGE = 2000;

/** 화면에 그대로 보여 주는 안내 문구. 서버와 테스트가 같은 값을 쓴다. */
export const MEDIA_MESSAGES = {
  formatRejected:
    "JPG, PNG, WebP, GIF 사진만 올릴 수 있습니다. 파일 이름만 바꾼 사진은 올라가지 않습니다.",
  svgRejected:
    "SVG 그림 파일은 올릴 수 없습니다. JPG 또는 PNG 사진으로 바꿔서 올려 주세요.",
  heicUnsupported:
    "아이폰 사진은 JPG로 바꿔서 올려 주세요(설정 > 카메라 > 포맷 > 높은 호환성).",
  altRequired:
    "대체 텍스트를 적어 주세요. 사진을 볼 수 없는 분께 읽어 주는 설명입니다.",
  tooLarge: (maxBytes: number) =>
    `사진은 ${Math.floor(maxBytes / (1024 * 1024))}MB 이하여야 합니다.`,
  inUse: "이 사진은 화면에서 쓰는 중이라 지울 수 없습니다. 먼저 그 화면에서 빼 주세요.",
  hideInUse:
    "이 사진은 화면에서 쓰는 중이라 숨길 수 없습니다. 먼저 그 화면에서 빼 주세요.",
  /** 기존 사이트 사진은 배포된 파일을 실행 중에 지울 수 없다. (AD-015) */
  legacyDeleteBlocked:
    "기존 사이트 사진은 지울 수 없습니다. 「숨기기」를 누르면 목록과 사진 고르기에서 빠집니다.",
  hidden: "숨긴 사진은 화면에 붙일 수 없습니다. 먼저 「다시 보이기」를 눌러 주세요.",
  nothingSelected: "지울 사진을 먼저 골라 주세요.",
} as const;

/**
 * 대체 텍스트는 필수다. 사진을 볼 수 없는 분께 읽어 주는 설명이라 비워 둘 수 없다.
 * 장식용으로 쓰고 싶으면 화면 쪽에서 빈 alt 로 바꿔 쓴다(시설 사진 갤러리).
 */
export const mediaAltSchema = z
  .string({ message: MEDIA_MESSAGES.altRequired })
  .trim()
  .min(2, { message: MEDIA_MESSAGES.altRequired })
  .max(200);

/** 올린 파일 이름. 저장 키에는 쓰지 않고 표시용으로만 둔다. */
export const mediaFilenameSchema = z.string().trim().min(1).max(200);

/**
 * 1단계 — 업로드 티켓 요청.
 *
 * 브라우저는 서버가 내준 티켓으로 저장소에 **직접** 파일을 올린다.
 * Vercel 함수의 요청 본문 상한(4.5MB, https://vercel.com/docs/functions/limitations)
 * 때문에 20MB 파일을 함수로 흘려보낼 수 없어서다. (ADR-008)
 */
export const mediaUploadTicketSchema = z.object({
  filename: mediaFilenameSchema,
  /** 브라우저가 보고한 크기. 믿지 않고 티켓 상한을 정하는 데만 쓴다. */
  sizeBytes: z.coerce.number().int().min(1),
});
export type MediaUploadTicketInput = z.infer<typeof mediaUploadTicketSchema>;

export type MediaUploadTicket = {
  /** 브라우저가 파일 바이트를 보낼 주소. */
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  /** 올린 뒤 마무리 요청에 그대로 넘기는 임시 저장 키. */
  stagingKey: string;
  /** 이 티켓으로 올릴 수 있는 최대 바이트. */
  maxBytes: number;
  expiresAt: string;
};

/**
 * 2단계 — 마무리. 서버가 임시 저장본을 읽어 형식·용량을 **다시** 검사하고,
 * 긴 변 2000px 이하로 줄이고 EXIF 를 지운 뒤 본 저장 위치에 넣는다.
 */
export const mediaFinalizeSchema = z.object({
  stagingKey: z.string().trim().min(1).max(300),
  filename: mediaFilenameSchema,
  alt: mediaAltSchema,
});
export type MediaFinalizeInput = z.infer<typeof mediaFinalizeSchema>;

export const MEDIA_SOURCES = ["UPLOAD", "LEGACY"] as const;
export type MediaSourceValue = (typeof MEDIA_SOURCES)[number];

export const MEDIA_SOURCE_LABELS: Record<MediaSourceValue, string> = {
  UPLOAD: "올린 사진",
  LEGACY: "기존 사이트 사진",
};

export const mediaListSchema = paginationSchema.extend({
  /** 파일 이름 또는 대체 텍스트 일부. */
  keyword: z.string().trim().max(60).optional(),
  source: z.enum(MEDIA_SOURCES).optional(),
  /** `used` 는 화면에서 쓰는 중, `unused` 는 쓰지 않는 사진만 본다. */
  usage: z.enum(["used", "unused"]).optional(),
  /**
   * 숨긴 사진을 어떻게 다룰지. 기본은 `visible` — 숨긴 사진은 목록에서 빠진다.
   * `hidden` 을 고르면 숨긴 사진만 모아 보고 다시 보이게 할 수 있다.
   */
  visibility: z.enum(["visible", "hidden"]).default("visible"),
});
export type MediaListInput = z.infer<typeof mediaListSchema>;

export const mediaAltUpdateSchema = z.object({
  mediaId: cuidLikeIdSchema,
  alt: mediaAltSchema,
});
export type MediaAltUpdateInput = z.infer<typeof mediaAltUpdateSchema>;

export const mediaDeleteSchema = z.object({ mediaId: cuidLikeIdSchema });
export type MediaDeleteInput = z.infer<typeof mediaDeleteSchema>;

/** 선택 삭제. 한 번에 고를 수 있는 수를 제한해 실수로 대량 삭제하는 것을 막는다. */
export const MEDIA_BULK_DELETE_MAX = 50;

export const mediaBulkDeleteSchema = z.object({
  mediaIds: z
    .array(cuidLikeIdSchema)
    .min(1, { message: MEDIA_MESSAGES.nothingSelected })
    .max(MEDIA_BULK_DELETE_MAX)
    // 같은 사진을 두 번 고른 것은 한 번으로 본다.
    .transform((ids) => [...new Set(ids)]),
});
export type MediaBulkDeleteInput = z.infer<typeof mediaBulkDeleteSchema>;

export const mediaHideSchema = z.object({
  mediaId: cuidLikeIdSchema,
  /**
   * `true` 면 숨기고 `false` 면 다시 보이게 한다.
   *
   * `z.coerce.boolean()` 을 쓰지 않는다 — `Boolean("false")` 는 `true` 라서 폼이 보낸
   * `"false"` 가 「숨기기」로 뒤집힌다. 문자열을 참·거짓으로 바꾸는 일은 부르는 쪽
   * (Server Action 의 `readBoolean`)에서 하고 여기서는 참·거짓만 받는다.
   */
  hidden: z.boolean(),
});
export type MediaHideInput = z.infer<typeof mediaHideSchema>;

/** 지우지 못한 사진 1건과 그 이유. 화면에 그대로 보여 준다. */
export type MediaDeleteBlocked = {
  id: string;
  filename: string;
  /**
   * `in-use` 화면에서 쓰는 중 · `legacy` 기존 사이트 사진(숨기기만 됨)
   * · `file` 저장된 파일을 지우지 못함(기록도 남겨 둔다) · `missing` 이미 없음
   */
  reason: "in-use" | "legacy" | "file" | "missing";
  usages: MediaUsagePlace[];
};

/** 삭제 결과. 한 장 삭제와 선택 삭제가 같은 모양을 쓴다. */
export type MediaDeleteResult = {
  /** 실제로 지운 사진. 기록과 파일을 함께 지웠다. */
  deleted: Array<{ id: string; filename: string }>;
  blocked: MediaDeleteBlocked[];
};

/** 막힌 이유를 사람이 읽는 말로 바꾼다. 화면과 테스트가 같은 문구를 쓴다. */
export const MEDIA_BLOCKED_REASON_LABELS: Record<MediaDeleteBlocked["reason"], string> =
  {
    "in-use": "화면에서 쓰는 중",
    legacy: "기존 사이트 사진 (숨기기만 됩니다)",
    file: "저장된 파일을 지우지 못함",
    missing: "이미 없는 사진",
  };

/**
 * 선택 삭제 결과를 한 문단으로 만든다. 일부만 지워진 경우를 사람이 바로 알 수 있게
 * **지운 수와 남긴 수를 함께** 적고, 남긴 사진은 이유와 쓰는 곳을 붙인다.
 */
export function describeMediaDeleteResult(result: MediaDeleteResult): string {
  const parts: string[] = [];

  if (result.deleted.length > 0) {
    parts.push(`${result.deleted.length}장을 지웠습니다.`);
  }

  if (result.blocked.length > 0) {
    parts.push(`${result.blocked.length}장은 지우지 않고 그대로 두었습니다.`);
    for (const item of result.blocked) {
      const where =
        item.usages.length > 0
          ? ` (쓰는 곳: ${item.usages
              .slice(0, 5)
              .map((usage) => `${usage.area} — ${usage.label}`)
              .join(", ")})`
          : "";
      parts.push(
        `· ${item.filename || item.id}: ${MEDIA_BLOCKED_REASON_LABELS[item.reason]}${where}`,
      );
    }
  }

  return parts.length > 0 ? parts.join(" ") : "지운 사진이 없습니다.";
}

/** 사진이 쓰이고 있는 자리 한 곳. 삭제를 막을 때 그대로 보여 준다. */
export type MediaUsagePlace = {
  /** 화면 묶음. 관리자 화면 이름과 같은 말을 쓴다. */
  area: "강사 사진" | "메인 배너" | "시설안내 사진" | "공지 본문";
  /** 그 자리의 이름(강사 성명·배너 제목·지점 이름·공지 제목). */
  label: string;
  /** 관리자 화면 주소. 바로 가서 뺄 수 있게 한다. */
  adminHref: string;
};

export type MediaAssetRow = {
  id: string;
  source: MediaSourceValue;
  url: string;
  filename: string;
  alt: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  rightsNote: string | null;
  replaceRecommended: boolean;
  uploadedAt: string;
  /** 숨긴 사진은 목록·고르기 상자에서 빠지고 새로 붙일 수 없다. */
  hidden: boolean;
  hiddenAt: string | null;
  usages: MediaUsagePlace[];
};

export type MediaAssetList = {
  items: MediaAssetRow[];
  total: number;
  page: number;
  pageSize: number;
  /** 보관함 전체 요약. 필터와 무관하게 센다. */
  counts: {
    total: number;
    uploaded: number;
    legacy: number;
    replaceRecommended: number;
    hidden: number;
  };
};

/* ------------------------------------------------------------------ *
 * 적용 화면 — 메인 배너 · 시설안내 사진
 * ------------------------------------------------------------------ */

/** 배너 버튼 주소는 사이트 안의 경로나 http(s) 주소만 받는다. */
export const bannerHrefSchema = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) => value === "" || /^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value),
    {
      message:
        "주소는 `/` 로 시작하는 사이트 안 경로나 http(s) 주소만 넣을 수 있습니다.",
    },
  );

export const homeBannerUpsertSchema = z.object({
  id: cuidLikeIdSchema.optional(),
  mediaId: cuidLikeIdSchema.nullable().default(null),
  eyebrow: z.string().trim().max(60).default(""),
  headline: z.string().trim().min(2).max(200),
  body: z.string().trim().max(500).default(""),
  primaryLabel: z.string().trim().max(40).default(""),
  primaryHref: bannerHrefSchema.default(""),
  secondaryLabel: z.string().trim().max(40).default(""),
  secondaryHref: bannerHrefSchema.default(""),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  /*
    `z.coerce.boolean()` 을 쓰지 않는다 — `Boolean("false")` 가 `true` 라서 폼이 보낸
    `"false"` 가 뒤집힌다. 위 `mediaHideSchema` 와 같은 규칙이다. 문자열 → 참·거짓은
    Server Action 의 `readBoolean()` 이 맡고 계약은 참·거짓만 받는다.
  */
  isVisible: z.boolean().default(true),
});
export type HomeBannerUpsertInput = z.infer<typeof homeBannerUpsertSchema>;

export const homeBannerDeleteSchema = z.object({ bannerId: cuidLikeIdSchema });
export type HomeBannerDeleteInput = z.infer<typeof homeBannerDeleteSchema>;

export type AdminHomeBannerRow = {
  id: string;
  mediaId: string | null;
  mediaUrl: string | null;
  mediaAlt: string | null;
  eyebrow: string;
  headline: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  displayOrder: number;
  isVisible: boolean;
};

/** 시설안내 지점 식별자. `src/lib/site-config.ts` 의 `Campus["id"]` 와 같은 값이다. */
export const FACILITY_CAMPUS_KEYS = ["daechi", "bundang"] as const;
export type FacilityCampusKey = (typeof FACILITY_CAMPUS_KEYS)[number];

export const facilityPhotoUpsertSchema = z.object({
  id: cuidLikeIdSchema.optional(),
  campusKey: z.enum(FACILITY_CAMPUS_KEYS),
  mediaId: cuidLikeIdSchema,
  /** 레거시처럼 비워 두면 장식용 사진으로 본다. */
  caption: z.string().trim().max(200).default(""),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  isVisible: z.coerce.boolean().default(true),
});
export type FacilityPhotoUpsertInput = z.infer<typeof facilityPhotoUpsertSchema>;

export const facilityPhotoDeleteSchema = z.object({ photoId: cuidLikeIdSchema });
export type FacilityPhotoDeleteInput = z.infer<typeof facilityPhotoDeleteSchema>;

export type AdminFacilityPhotoRow = {
  id: string;
  campusKey: FacilityCampusKey;
  mediaId: string;
  mediaUrl: string;
  mediaAlt: string;
  caption: string;
  displayOrder: number;
  isVisible: boolean;
};

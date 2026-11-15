import "server-only";
import sharp, { type Sharp } from "sharp";
import {
  MEDIA_CONTENT_TYPES,
  MEDIA_MAX_LONG_EDGE,
  MEDIA_MESSAGES,
  type MediaImageFormat,
} from "@/lib/contracts";
import { validationFailed } from "@/server/errors";
import { detectUploadImage } from "@/server/lib/file-format";

/**
 * AD-015 사진 저장 전 처리.
 *
 * 저장하는 것은 **다시 인코딩한 결과 하나뿐**이다. 올린 원본은 보관하지 않는다.
 * - 형식은 파일 내용으로 가린다. SVG 는 받지 않는다.
 * - HEIC(아이폰 사진)는 JPG 변환을 시도하고, 못 하면 쉬운 안내를 돌려준다. // ASM-091
 * - 긴 변 2000px 이하로 줄인다(원본이 더 작으면 그대로 둔다).
 * - EXIF 를 지운다. 촬영 위치(GPS)가 사진에 남는 것을 막는다. (BLUEPRINT 10장)
 * - 방향(Orientation)은 픽셀에 반영한 뒤 지운다. 세운 사진이 눕지 않게 한다.
 *
 * `sharp` 는 `.withMetadata()` 를 부르지 않으면 메타데이터를 **빼고** 다시 쓴다.
 * 그래서 EXIF 제거는 재인코딩 자체로 이뤄진다. 지웠는지는 테스트에서 확인한다.
 */

export type NormalizedImage = {
  bytes: Uint8Array;
  format: MediaImageFormat;
  contentType: string;
  width: number;
  height: number;
  /** 원본이 HEIC·AVIF 라서 JPG 로 바꿔 저장한 경우 true. */
  converted: boolean;
};

/** GIF·WebP 는 여러 장이 들어 있을 수 있어 움직임을 살려서 처리한다. */
function isAnimatedFormat(format: MediaImageFormat): boolean {
  return format === "gif" || format === "webp";
}

function encode(
  pipeline: Sharp,
  format: MediaImageFormat,
): { pipeline: Sharp; contentType: string } {
  const contentType = MEDIA_CONTENT_TYPES[format];
  switch (format) {
    case "jpeg":
      // `mozjpeg` 로 같은 화질에서 용량을 줄인다. 번들된 libvips 에 들어 있다.
      return { pipeline: pipeline.jpeg({ quality: 82, mozjpeg: true }), contentType };
    case "png":
      return { pipeline: pipeline.png({ compressionLevel: 9 }), contentType };
    case "webp":
      return { pipeline: pipeline.webp({ quality: 82 }), contentType };
    case "gif":
      return { pipeline: pipeline.gif(), contentType };
  }
}

/**
 * 올린 바이트를 저장할 모양으로 바꾼다. 받을 수 없는 파일이면 사용자 문구와 함께 던진다.
 *
 * `field` 는 화면에서 오류를 붙일 입력란 이름이다.
 */
export async function normalizeUploadedImage(
  bytes: Uint8Array,
  options: { maxBytes: number; field?: string },
): Promise<NormalizedImage> {
  const field = options.field ?? "image";

  if (bytes.byteLength > options.maxBytes) {
    throw validationFailed({ [field]: [MEDIA_MESSAGES.tooLarge(options.maxBytes)] });
  }

  const detected = detectUploadImage(bytes);
  if (!detected) {
    throw validationFailed({ [field]: [MEDIA_MESSAGES.formatRejected] });
  }
  if (detected.kind === "svg") {
    throw validationFailed({ [field]: [MEDIA_MESSAGES.svgRejected] });
  }

  // HEIC·AVIF 는 JPG 로 바꿔서 저장한다. 번들된 libvips 가 그 압축을 못 풀면 안내로 돌린다.
  const targetFormat: MediaImageFormat =
    detected.kind === "heif" ? "jpeg" : detected.format;
  const converted = detected.kind === "heif";
  const animated = detected.kind === "image" && isAnimatedFormat(detected.format);

  try {
    const source = sharp(bytes, { animated, failOn: "error" });

    // `.rotate()` 를 인수 없이 부르면 EXIF Orientation 을 픽셀에 반영한다.
    // 여러 장짜리 이미지에는 방향 정보가 없고 rotate 가 장 수를 흩트릴 수 있어 건너뛴다.
    const oriented = animated ? source : source.rotate();

    const resized = oriented.resize({
      width: MEDIA_MAX_LONG_EDGE,
      height: MEDIA_MAX_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });

    const { pipeline, contentType } = encode(resized, targetFormat);
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

    return {
      bytes: new Uint8Array(data),
      format: targetFormat,
      contentType,
      width: info.width,
      // 여러 장짜리는 `height` 가 전체 장을 이어 붙인 높이다. 한 장 높이로 되돌린다.
      height:
        info.pages && info.pages > 1
          ? Math.round(info.height / info.pages)
          : info.height,
      converted,
    };
  } catch (error) {
    if (detected.kind === "heif") {
      // 설치된 libvips 는 AVIF 만 풀 수 있고 아이폰의 HEVC 묶음은 풀지 못한다. // ASM-091
      throw validationFailed({ [field]: [MEDIA_MESSAGES.heicUnsupported] });
    }

    // 시그니처는 맞지만 내용이 깨진 파일. 내부 예외 내용은 내보내지 않는다.
    console.error("image_normalize_failed", {
      name: error instanceof Error ? error.name : "Unknown",
      format: targetFormat,
    });
    throw validationFailed({ [field]: [MEDIA_MESSAGES.formatRejected] });
  }
}

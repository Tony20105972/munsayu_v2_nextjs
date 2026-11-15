import "server-only";
import { RESUME_FILE_FORMATS, type ResumeFileFormat } from "@/lib/contracts";

/**
 * 올라온 파일의 형식을 **내용으로** 판별한다. 확장자와 `Content-Type` 은 믿지 않는다.
 * 확장자만 바꾼 위장 파일을 막기 위한 것이다. (AD-011, 사용자 지시 2026-11-12)
 */

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP_MAGIC = [0x50, 0x4b]; // PK
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // HWP 5.0 복합 문서

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((value, index) => bytes[index] === value);
}

/** ZIP·OLE 안의 표식 문자열을 찾는다. 앞부분만 보면 놓칠 수 있어 전체를 본다. */
function containsAscii(bytes: Uint8Array, needle: string): boolean {
  const target = Buffer.from(needle, "latin1");
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).includes(target);
}

/** HWP 5.0 은 OLE 복합 문서이고 FileHeader 스트림에 이 문구가 들어 있다. */
const HWP_SIGNATURE = "HWP Document File";

export function detectResumeFormat(bytes: Uint8Array): ResumeFileFormat | null {
  if (startsWith(bytes, PDF_MAGIC)) return "pdf";

  if (startsWith(bytes, OLE_MAGIC)) {
    // UTF-16LE 로도 적히므로 두 가지를 모두 확인한다.
    const utf16 = HWP_SIGNATURE.split("").join("\u0000");
    if (containsAscii(bytes, HWP_SIGNATURE) || containsAscii(bytes, utf16)) {
      return "hwp";
    }
    return null;
  }

  if (startsWith(bytes, ZIP_MAGIC)) {
    // HWPX 는 OCF 묶음이라 mimetype 이 `application/hwp+zip` 이다.
    if (
      containsAscii(bytes, "application/hwp+zip") ||
      containsAscii(bytes, "Contents/content.hpf") ||
      containsAscii(bytes, "Contents/header.xml")
    ) {
      return "hwpx";
    }
    // DOCX 는 OOXML 묶음이라 `word/` 항목이 반드시 있다.
    if (containsAscii(bytes, "word/document.xml") || containsAscii(bytes, "word/")) {
      return "docx";
    }
    return null;
  }

  return null;
}

export function isAllowedResumeFormat(
  format: ResumeFileFormat | null,
): format is ResumeFileFormat {
  return format !== null && RESUME_FILE_FORMATS.includes(format);
}

const IMAGE_MAGICS: ReadonlyArray<{
  format: RasterImageFormat;
  magic: number[];
  contentType: string;
}> = [
  { format: "png", magic: [0x89, 0x50, 0x4e, 0x47], contentType: "image/png" },
  { format: "jpeg", magic: [0xff, 0xd8, 0xff], contentType: "image/jpeg" },
  { format: "gif", magic: [0x47, 0x49, 0x46, 0x38], contentType: "image/gif" },
];

export type RasterImageFormat = "png" | "jpeg" | "gif" | "webp";

/** 공지 본문 이미지도 내용으로 확인한다. SVG 는 스크립트를 담을 수 있어 받지 않는다. (AD-014) */
export function detectImageFormat(
  bytes: Uint8Array,
): { format: RasterImageFormat; contentType: string } | null {
  for (const candidate of IMAGE_MAGICS) {
    if (startsWith(bytes, candidate.magic)) {
      return { format: candidate.format, contentType: candidate.contentType };
    }
  }

  // WEBP 는 RIFF 컨테이너라 8바이트 뒤에 `WEBP` 가 온다.
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length > 12 &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === "WEBP"
  ) {
    return { format: "webp", contentType: "image/webp" };
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * AD-015 관리자 사진 업로드 판별
 * ------------------------------------------------------------------ */

/**
 * 올린 사진을 **내용으로** 가려낸다. 확장자와 `Content-Type` 은 믿지 않는다.
 *
 * - `image`: 그대로 쓸 수 있는 형식 (JPG·PNG·WebP·GIF)
 * - `svg`: 받지 않는다. 안에 스크립트를 넣을 수 있다.
 * - `heif`: 아이폰 사진 묶음(HEIC·AVIF). 서버에서 JPG 변환을 시도한다. // ASM-091
 * - `null`: 그 밖의 모든 것. 이름만 `.jpg` 로 바꾼 파일이 여기로 떨어진다.
 */
export type UploadImageKind =
  | { kind: "image"; format: RasterImageFormat; contentType: string }
  | { kind: "svg" }
  | { kind: "heif"; brand: string };

/** ISO/IEC 14496-12 `ftyp` 박스의 브랜드 중 HEIF 묶음에 해당하는 것들. */
const HEIF_BRANDS = new Set([
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
  "avif",
  "avis",
]);

function asciiAt(bytes: Uint8Array, start: number, length: number): string {
  if (bytes.length < start + length) return "";
  let out = "";
  for (let index = start; index < start + length; index += 1) {
    out += String.fromCharCode(bytes[index]);
  }
  return out;
}

/**
 * SVG 는 텍스트 파일이라 시그니처가 없다. 앞부분에서 `<svg` 또는 `<?xml` 를 찾는다.
 * 공백·BOM·주석·DOCTYPE 이 앞에 올 수 있어 넉넉히 1KB 를 본다.
 */
function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = Buffer.from(
    bytes.buffer,
    bytes.byteOffset,
    Math.min(bytes.byteLength, 1024),
  )
    .toString("utf8")
    .toLowerCase();
  return head.includes("<svg") || (head.includes("<?xml") && head.includes("svg"));
}

export function detectUploadImage(bytes: Uint8Array): UploadImageKind | null {
  const detected = detectImageFormat(bytes);
  if (detected) {
    return {
      kind: "image",
      format: detected.format,
      contentType: detected.contentType,
    };
  }

  // HEIF 묶음은 `....ftyp<brand>` 로 시작한다. 길이 칸 4바이트 뒤에 `ftyp` 가 온다.
  if (asciiAt(bytes, 4, 4) === "ftyp") {
    const brand = asciiAt(bytes, 8, 4).toLowerCase();
    if (HEIF_BRANDS.has(brand)) {
      return { kind: "heif", brand };
    }
    return null;
  }

  if (looksLikeSvg(bytes)) {
    return { kind: "svg" };
  }

  return null;
}

import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { MEDIA_MESSAGES } from "@/lib/contracts";
import { AppError } from "@/server/errors";
import { detectUploadImage } from "@/server/lib/file-format";
import { normalizeUploadedImage } from "@/server/lib/image-pipeline";

/**
 * AD-015 사진 업로드 검사·변환.
 *
 * 여기 쓰는 그림은 모두 테스트가 직접 만든 것이다. 실제 학원 사진을 쓰지 않는다.
 */

const MAX_BYTES = 20 * 1024 * 1024;

async function makeJpeg(
  width: number,
  height: number,
  options: { withExif?: boolean; orientation?: number } = {},
): Promise<Uint8Array> {
  let pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 80, b: 40 },
    },
  });

  if (options.withExif || options.orientation) {
    pipeline = pipeline.withMetadata({
      orientation: options.orientation,
      exif: {
        IFD0: { Make: "TestCamera", Model: "TestModel" },
        // IFD3 은 GPS IFD 다. 촬영 위치는 저장 뒤에 남아 있지 않아야 한다. (BLUEPRINT 10장)
        IFD3: { GPSLatitudeRef: "N", GPSLongitudeRef: "E" },
      },
    });
  }

  return new Uint8Array(await pipeline.jpeg().toBuffer());
}

async function errorFrom(bytes: Uint8Array): Promise<AppError> {
  try {
    await normalizeUploadedImage(bytes, { maxBytes: MAX_BYTES });
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("오류가 나야 하는데 통과했습니다.");
}

describe("AD-015 형식 판별", () => {
  test("JPG·PNG·WebP·GIF 는 내용으로 알아본다", async () => {
    const jpeg = await makeJpeg(10, 10);
    const png = new Uint8Array(await sharp(jpeg).png().toBuffer());
    const webp = new Uint8Array(await sharp(jpeg).webp().toBuffer());
    const gif = new Uint8Array(await sharp(jpeg).gif().toBuffer());

    expect(detectUploadImage(jpeg)).toMatchObject({ kind: "image", format: "jpeg" });
    expect(detectUploadImage(png)).toMatchObject({ kind: "image", format: "png" });
    expect(detectUploadImage(webp)).toMatchObject({ kind: "image", format: "webp" });
    expect(detectUploadImage(gif)).toMatchObject({ kind: "image", format: "gif" });
  });

  test("이름만 .jpg 로 바꾼 파일은 거부한다", async () => {
    // 내용은 ZIP 이고 이름만 사진인 파일. 확장자를 믿지 않는다는 확인이다.
    const fake = new Uint8Array(Buffer.from("PK not an image at all"));

    expect(detectUploadImage(fake)).toBeNull();
    const error = await errorFrom(fake);
    expect(error.status).toBe(422);
    expect(error.fieldErrors?.image).toContain(MEDIA_MESSAGES.formatRejected);
  });

  test("SVG 는 거부하고 그 이유를 쉬운 말로 알려 준다", async () => {
    const svg = new Uint8Array(
      Buffer.from(
        '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        "utf8",
      ),
    );

    expect(detectUploadImage(svg)).toEqual({ kind: "svg" });
    const error = await errorFrom(svg);
    expect(error.fieldErrors?.image).toContain(MEDIA_MESSAGES.svgRejected);
  });

  test("HEIF 묶음은 ftyp 브랜드로 알아본다", async () => {
    // AVIF 는 HEIF 묶음의 한 종류다. 설치된 libvips 가 풀 수 있는 쪽이다.
    const avif = new Uint8Array(
      await sharp({
        create: { width: 8, height: 8, channels: 3, background: "#123456" },
      })
        .heif({ compression: "av1" })
        .toBuffer(),
    );

    expect(detectUploadImage(avif)).toMatchObject({ kind: "heif" });
  });

  test("아이폰 HEIC(HEVC)는 변환할 수 없어 쉬운 안내를 돌려준다", async () => {
    /*
     * 번들된 libvips 는 HEIF 중 AVIF 만 풀 수 있고 아이폰의 HEVC 묶음은 풀지 못한다.
     * 테스트용 HEVC 파일을 만들 수도 없어(인코더도 없다) `ftyp heic` 머리만 둔
     * 파일로 "브랜드는 HEIC 인데 내용을 풀 수 없는" 경우를 만든다. 사용자가 보는
     * 결과는 실제 아이폰 사진과 같다. // ASM-091
     */
    const header = Buffer.alloc(32);
    header.writeUInt32BE(32, 0);
    header.write("ftyp", 4, "latin1");
    header.write("heic", 8, "latin1");
    const heic = new Uint8Array(header);

    expect(detectUploadImage(heic)).toEqual({ kind: "heif", brand: "heic" });
    const error = await errorFrom(heic);
    expect(error.fieldErrors?.image).toContain(MEDIA_MESSAGES.heicUnsupported);
  });
});

describe("AD-015 저장 전 처리", () => {
  test("긴 변이 2000px 을 넘으면 비율을 지켜 줄인다", async () => {
    const big = await makeJpeg(3200, 1800);

    const result = await normalizeUploadedImage(big, { maxBytes: MAX_BYTES });

    expect(result.width).toBe(2000);
    expect(result.height).toBe(1125);
    expect(result.format).toBe("jpeg");
  });

  test("원본이 2000px 보다 작으면 늘리지 않는다", async () => {
    const small = await makeJpeg(640, 480);

    const result = await normalizeUploadedImage(small, { maxBytes: MAX_BYTES });

    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
  });

  test("EXIF 와 촬영 위치(GPS)를 지운다", async () => {
    const withExif = await makeJpeg(400, 300, { withExif: true });
    // 넣었는지 먼저 확인한다. 확인 없이 "지웠다"고 말할 수 없다.
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const result = await normalizeUploadedImage(withExif, { maxBytes: MAX_BYTES });

    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.exif).toBeUndefined();
  });

  test("세워서 찍은 사진의 방향 정보를 픽셀에 반영한다", async () => {
    // Orientation 6 = 오른쪽으로 90도 돌려서 보여야 하는 사진.
    const rotated = await makeJpeg(400, 200, { orientation: 6 });

    const result = await normalizeUploadedImage(rotated, { maxBytes: MAX_BYTES });

    // 돌린 결과가 픽셀에 들어가 가로·세로가 바뀐다.
    expect(result.width).toBe(200);
    expect(result.height).toBe(400);
    expect((await sharp(result.bytes).metadata()).orientation).toBeUndefined();
  });

  test("풀 수 있는 HEIF(AVIF)는 JPG 로 바꿔 저장한다", async () => {
    const avif = new Uint8Array(
      await sharp({
        create: { width: 120, height: 90, channels: 3, background: "#204020" },
      })
        .heif({ compression: "av1" })
        .toBuffer(),
    );

    const result = await normalizeUploadedImage(avif, { maxBytes: MAX_BYTES });

    expect(result.converted).toBe(true);
    expect(result.format).toBe("jpeg");
    expect(result.contentType).toBe("image/jpeg");
    expect((await sharp(result.bytes).metadata()).format).toBe("jpeg");
  });

  test("용량 상한을 넘으면 받지 않는다", async () => {
    const bytes = new Uint8Array(1024);
    try {
      await normalizeUploadedImage(bytes, { maxBytes: 512 });
      throw new Error("오류가 나야 하는데 통과했습니다.");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).fieldErrors?.image).toContain(
        MEDIA_MESSAGES.tooLarge(512),
      );
    }
  });

  test("GIF 는 GIF 로 저장하고 크기를 지킨다", async () => {
    /*
     * 여러 장짜리 GIF 는 테스트에서 만들 방법이 없어(libvips 에 GIF 인코더만 있고
     * 여러 장을 합치는 길이 없다) 한 장짜리로 형식 유지만 확인한다. 여러 장짜리는
     * `animated: true` 로 읽어 장을 모두 살리고, 높이는 장 수로 나눠 한 장 높이를
     * 돌려준다(`image-pipeline.ts`). 그 부분은 자동 검증이 없다. // ASM-094
     */
    const gif = new Uint8Array(
      await sharp({
        create: { width: 60, height: 40, channels: 3, background: "#654321" },
      })
        .gif()
        .toBuffer(),
    );

    const result = await normalizeUploadedImage(gif, { maxBytes: MAX_BYTES });

    expect(result.format).toBe("gif");
    expect(result.contentType).toBe("image/gif");
    expect(result.width).toBe(60);
    expect(result.height).toBe(40);
  });
});

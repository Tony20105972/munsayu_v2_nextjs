import { describe, expect, test } from "vitest";
import { detectImageFormat, detectResumeFormat } from "@/server/lib/file-format";

/**
 * AD-011 제출 서류 형식 검사.
 * 확장자가 아니라 **파일 내용**으로 판별하는지 확인한다. (사용자 지시 2026-11-12) // ASM-085
 */

function bytes(...parts: Array<string | number[]>): Uint8Array {
  const chunks = parts.map((part) =>
    typeof part === "string" ? Buffer.from(part, "latin1") : Buffer.from(part),
  );
  return new Uint8Array(Buffer.concat(chunks));
}

/** ZIP(PK) 머리 + 안쪽 항목 이름 */
const ZIP_HEAD = [0x50, 0x4b, 0x03, 0x04];
const OLE_HEAD = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

describe("AD-011 제출 서류 형식 판별", () => {
  test("PDF 는 %PDF 머리로 알아본다", () => {
    expect(detectResumeFormat(bytes("%PDF-1.7\n내용"))).toBe("pdf");
  });

  test("DOCX 는 ZIP 안의 word/ 항목으로 알아본다", () => {
    const docx = bytes(ZIP_HEAD, "[Content_Types].xml", "word/document.xml");
    expect(detectResumeFormat(docx)).toBe("docx");
  });

  test("HWPX 는 ZIP 안의 hwp 표시로 알아본다", () => {
    const hwpx = bytes(ZIP_HEAD, "mimetype", "application/hwp+zip");
    expect(detectResumeFormat(hwpx)).toBe("hwpx");
  });

  test("HWP 5.0 은 OLE 머리와 서명 문구로 알아본다", () => {
    const hwp = bytes(OLE_HEAD, new Array(24).fill(0), "HWP Document File");
    expect(detectResumeFormat(hwp)).toBe("hwp");
  });

  test("확장자만 바꾼 위장 파일은 받지 않는다 — 실제 내용이 실행 가능한 스크립트", () => {
    // resume.pdf 라는 이름으로 올라와도 내용이 PDF 가 아니면 걸린다.
    const disguised = bytes("#!/bin/sh\nrm -rf /\n");
    expect(detectResumeFormat(disguised)).toBeNull();
  });

  test("위장 파일 — 내용이 HTML 이면 받지 않는다", () => {
    expect(detectResumeFormat(bytes("<html><script>alert(1)</script>"))).toBeNull();
  });

  test("ZIP 이지만 문서 묶음이 아니면 받지 않는다", () => {
    expect(detectResumeFormat(bytes(ZIP_HEAD, "photos/a.jpg"))).toBeNull();
  });

  test("빈 파일은 어떤 형식도 아니다", () => {
    expect(detectResumeFormat(new Uint8Array())).toBeNull();
  });
});

describe("AD-014 공지 본문 이미지 형식 판별", () => {
  test("PNG·JPEG·GIF·WEBP 는 받는다", () => {
    expect(detectImageFormat(bytes([0x89, 0x50, 0x4e, 0x47]))?.format).toBe("png");
    expect(detectImageFormat(bytes([0xff, 0xd8, 0xff, 0xe0]))?.format).toBe("jpeg");
    expect(detectImageFormat(bytes([0x47, 0x49, 0x46, 0x38, 0x39]))?.format).toBe(
      "gif",
    );
    expect(detectImageFormat(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "))?.format).toBe(
      "webp",
    );
  });

  test("SVG 는 받지 않는다 — 안에 스크립트를 넣을 수 있다", () => {
    const svg = bytes('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    expect(detectImageFormat(svg)).toBeNull();
  });
});

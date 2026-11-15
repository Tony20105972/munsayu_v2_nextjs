import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { proxy } from "../../proxy";

/**
 * CSP 의 `connect-src` 가 Blob 업로드 주소를 막지 않는지 고정한다. (AD-015, ADR-008)
 *
 * 왜 필요한가 — Phase 6 이 보안 헤더를 넣고 Phase 7 이 Blob 어댑터를 넣었는데, 둘을
 * 이어 주는 자리가 비어 있었다. 사진 바이트는 브라우저가 `https://vercel.com/api/blob/...`
 * 로 직접 PUT 하므로 `connect-src` 를 지나가는데, 거기에 그 주소가 없어서 **스테이징에서
 * 업로드가 전부 막혔다** (OBSERVED 2026-11-15, EV-0019). `img-src` 만 열려 있어서
 * 「보기는 되고 올리기는 안 되는」 상태였고, 로컬 파일 저장소에서는 드러나지 않는다.
 */

const previousAdapter = process.env.STORAGE_ADAPTER;

afterEach(() => {
  if (previousAdapter === undefined) delete process.env.STORAGE_ADAPTER;
  else process.env.STORAGE_ADAPTER = previousAdapter;
});

function cspFor(storageAdapter: string | undefined): string {
  if (storageAdapter === undefined) delete process.env.STORAGE_ADAPTER;
  else process.env.STORAGE_ADAPTER = storageAdapter;

  const response = proxy(new NextRequest("https://example.test/"));
  return response.headers.get("content-security-policy") ?? "";
}

function directive(csp: string, name: string): string {
  const found = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
  return found ?? "";
}

describe("CSP 와 Blob 업로드", () => {
  it("STORAGE_ADAPTER=vercel-blob 이면 서명된 PUT 주소를 connect-src 가 허용한다", () => {
    const connect = directive(cspFor("vercel-blob"), "connect-src");
    expect(connect).toContain("https://vercel.com");
  });

  it("로컬 파일 저장소에서는 Blob 주소를 열지 않는다", () => {
    const connect = directive(cspFor("local"), "connect-src");
    expect(connect).not.toContain("vercel.com/api");
    expect(connect).not.toContain("https://vercel.com");
  });

  it("값이 없으면(로컬 기본) 열지 않는다", () => {
    expect(directive(cspFor(undefined), "connect-src")).not.toContain(
      "https://vercel.com",
    );
  });

  it("보기 경로(img-src)는 어느 쪽이든 Blob 공개 호스트를 허용한다", () => {
    for (const adapter of ["vercel-blob", "local"]) {
      expect(directive(cspFor(adapter), "img-src")).toContain(
        "https://*.public.blob.vercel-storage.com",
      );
    }
  });
});

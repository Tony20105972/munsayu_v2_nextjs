import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 공개 사진과 비공개 파일이 **서로 다른 Blob 저장소**로 가는지 고정한다.
 * (AD-011 이력서 · AD-015 사진 · ADR-008 · EV-0019)
 *
 * 왜 필요한가 — Blob 저장소의 공개/비공개는 만들 때 고정되고 한 저장소가 둘을 함께
 * 담지 못한다. 그래서 저장소가 둘이고, **어느 영역이 어느 저장소로 가는지**가 곧
 * 개인정보 경계다. 토큰 이름을 하나라도 섞으면 **이력서가 공개 저장소로** 올라가
 * 누구나 주소로 받을 수 있게 된다. 되돌릴 수 없는 사고다.
 *
 * 그래서 「이력서는 비공개 저장소」만 보지 않고 **「공개 저장소 값이 비공개 경로에
 * 절대 나타나지 않는다」**까지 본다.
 */

const blobCalls = {
  put: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  issueSignedToken: vi.fn(),
  presignUrl: vi.fn(),
};

vi.mock("@vercel/blob", () => blobCalls);

const PUBLIC_TOKEN = "vercel_blob_rw_PUBLICSTORE_testonly";
const PUBLIC_STORE = "store_publicstore";
const PRIVATE_TOKEN = "vercel_blob_rw_PRIVATESTORE_testonly";
const PRIVATE_STORE = "store_privatestore";

const KEYS = [
  "BLOB_PUBLIC_READ_WRITE_TOKEN",
  "BLOB_PUBLIC_STORE_ID",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID",
  "BLOB_PRIVATE_READ_WRITE_TOKEN",
  "BLOB_PRIVATE_STORE_ID",
] as const;

const saved = new Map<string, string | undefined>();

async function loadTargetFor() {
  vi.resetModules();
  const mod = await import("@/server/adapters/storage");
  return mod.blobTargetForScope;
}

describe("Blob 저장소 분리 (공개 / 비공개)", () => {
  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env.BLOB_PUBLIC_READ_WRITE_TOKEN = PUBLIC_TOKEN;
    process.env.BLOB_PUBLIC_STORE_ID = PUBLIC_STORE;
    process.env.BLOB_READ_WRITE_TOKEN = PRIVATE_TOKEN;
    process.env.BLOB_STORE_ID = PRIVATE_STORE;
  });

  afterEach(() => {
    for (const key of KEYS) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("공개 사진은 공개 저장소로 간다", async () => {
    const blobTargetForScope = await loadTargetFor();
    expect(blobTargetForScope("public")).toEqual({
      token: PUBLIC_TOKEN,
      storeId: PUBLIC_STORE,
    });
  });

  it("이력서(private)는 **공개 저장소로 가지 않는다**", async () => {
    const blobTargetForScope = await loadTargetFor();
    const target = blobTargetForScope("private");

    expect(target).toEqual({ token: PRIVATE_TOKEN, storeId: PRIVATE_STORE });
    // 공개 저장소의 값이 조금이라도 섞여 있으면 실패한다.
    expect(target.token).not.toBe(PUBLIC_TOKEN);
    expect(target.storeId).not.toBe(PUBLIC_STORE);
    expect(JSON.stringify(target)).not.toContain("PUBLICSTORE");
    expect(JSON.stringify(target)).not.toContain("publicstore");
  });

  it("검사 전 원본(staging)도 공개 저장소로 가지 않는다", async () => {
    const blobTargetForScope = await loadTargetFor();
    const target = blobTargetForScope("staging");

    expect(target).toEqual({ token: PRIVATE_TOKEN, storeId: PRIVATE_STORE });
    expect(JSON.stringify(target)).not.toContain("publicstore");
  });

  it("`BLOB_PRIVATE_*` 를 두면 그것을 먼저 쓴다 (통합 접두사를 바꾼 경우)", async () => {
    process.env.BLOB_PRIVATE_READ_WRITE_TOKEN = "vercel_blob_rw_RENAMED_testonly";
    process.env.BLOB_PRIVATE_STORE_ID = "store_renamed";

    const blobTargetForScope = await loadTargetFor();
    expect(blobTargetForScope("private")).toEqual({
      token: "vercel_blob_rw_RENAMED_testonly",
      storeId: "store_renamed",
    });
  });

  it("공개 쪽은 비공개 저장소 이름으로 **떨어지지 않는다** — 없으면 멈춘다", async () => {
    delete process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;

    const blobTargetForScope = await loadTargetFor();
    // 조용히 `BLOB_READ_WRITE_TOKEN`(비공개)으로 가면 공개 사진이 비공개 저장소에
    // 들어가 화면에 뜨지 않거나, 반대 방향의 사고가 열린다. 그래서 던진다.
    expect(() => blobTargetForScope("public")).toThrow(
      /BLOB_PUBLIC_READ_WRITE_TOKEN/,
    );
  });

  it("공개 저장소 id 가 없으면 멈춘다", async () => {
    delete process.env.BLOB_PUBLIC_STORE_ID;

    const blobTargetForScope = await loadTargetFor();
    expect(() => blobTargetForScope("public")).toThrow(/BLOB_PUBLIC_STORE_ID/);
  });

  it("비공개 저장소 설정이 없으면 멈춘다 (공개 저장소로 돌아가지 않는다)", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const blobTargetForScope = await loadTargetFor();
    expect(() => blobTargetForScope("private")).toThrow(/BLOB_READ_WRITE_TOKEN/);
  });

  it("어댑터의 올리기·읽기·지우기가 영역에 맞는 저장소를 쓴다", async () => {
    vi.resetModules();
    blobCalls.put.mockResolvedValue({ url: "https://example.test/public/a.png" });
    blobCalls.get.mockResolvedValue({
      statusCode: 200,
      stream: new Response(new Uint8Array([1, 2, 3])).body,
    });
    blobCalls.del.mockResolvedValue(undefined);

    process.env.STORAGE_ADAPTER = "vercel-blob";
    const mod = await import("@/server/adapters/storage");
    const adapter = mod.getStorageAdapter();

    await adapter.put("public", "media/a.png", new Uint8Array([1]), "image/png");
    expect(blobCalls.put.mock.calls[0]?.[2]).toMatchObject({
      token: PUBLIC_TOKEN,
      storeId: PUBLIC_STORE,
      access: "public",
    });

    await adapter.get("private", "resume/b.pdf");
    expect(blobCalls.get.mock.calls[0]?.[1]).toMatchObject({
      token: PRIVATE_TOKEN,
      storeId: PRIVATE_STORE,
      access: "private",
    });

    await adapter.remove("private", "resume/b.pdf");
    expect(blobCalls.del.mock.calls[0]?.[1]).toMatchObject({
      token: PRIVATE_TOKEN,
      storeId: PRIVATE_STORE,
    });

    delete process.env.STORAGE_ADAPTER;
  });
});

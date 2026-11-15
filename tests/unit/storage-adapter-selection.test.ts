import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Phase 7 저장소 어댑터 선택.
 *
 * 운영에서 사진이 사라지는 사고는 대개 "설정 이름이 틀렸는데 조용히 기본값으로
 * 떨어졌다"에서 나온다. Vercel 함수의 파일 시스템은 요청이 끝나면 없어지므로,
 * 운영에서 로컬 어댑터로 떨어지면 올린 사진이 그대로 유실된다.
 * 그래서 모르는 이름은 통과시키지 않고 멈추는 것을 고정한다. (ASM-008, ADR-008)
 */

// `@vercel/blob` 은 모듈을 읽는 순간 토큰을 요구하지 않지만, 단위 테스트에서
// 실제 저장소로 나가지 않도록 전부 막는다.
vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  issueSignedToken: vi.fn(),
  presignUrl: vi.fn(),
}));

const original = process.env.STORAGE_ADAPTER;

async function loadGetStorageAdapter() {
  // 어댑터는 모듈 수준에서 한 번 만들어진다. 환경 변수를 바꾼 뒤 다시 읽는다.
  vi.resetModules();
  const mod = await import("@/server/adapters/storage");
  return mod.getStorageAdapter;
}

describe("Phase 7 저장소 어댑터 선택", () => {
  beforeEach(() => {
    delete process.env.STORAGE_ADAPTER;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.STORAGE_ADAPTER;
    else process.env.STORAGE_ADAPTER = original;
  });

  it("비어 있으면 로컬 어댑터를 쓴다 (개발 기본값)", async () => {
    const getStorageAdapter = await loadGetStorageAdapter();
    expect(getStorageAdapter().name).toBe("local");
  });

  it("공백만 있어도 값 없음으로 보고 로컬 어댑터를 쓴다", async () => {
    process.env.STORAGE_ADAPTER = "   ";
    const getStorageAdapter = await loadGetStorageAdapter();
    expect(getStorageAdapter().name).toBe("local");
  });

  it("vercel-blob 이면 Blob 어댑터를 쓴다", async () => {
    process.env.STORAGE_ADAPTER = "vercel-blob";
    const getStorageAdapter = await loadGetStorageAdapter();
    expect(getStorageAdapter().name).toBe("vercel-blob");
  });

  it("모르는 이름이면 조용히 로컬로 떨어지지 않고 멈춘다", async () => {
    process.env.STORAGE_ADAPTER = "vercel_blob";
    const getStorageAdapter = await loadGetStorageAdapter();
    expect(() => getStorageAdapter()).toThrow(/UNKNOWN_STORAGE_ADAPTER/);
  });

  it("영역 밖을 가리키는 키는 조용히 고치지 않고 거절한다", async () => {
    process.env.STORAGE_ADAPTER = "vercel-blob";
    const blob = (await loadGetStorageAdapter())();

    /*
     * 고쳐서 쓰면 `private/../public/x` 가 `public/x` 로 바뀌어, 비공개로 올린 줄
     * 알았던 이력서가 공개 영역에 들어갈 수 있다. 그래서 던져야 한다.
     * `urlFor` 가 같은 경로 계산을 쓰므로 그것으로 확인한다.
     */
    for (const key of ["../public/x.webp", "..", "/etc/passwd", "a/../../x.webp"]) {
      expect(() => blob.urlFor("public", key)).toThrow(/STORAGE_KEY_OUT_OF_SCOPE/);
    }
  });

  it("정상 키는 영역 접두사를 붙여 그대로 쓴다", async () => {
    process.env.STORAGE_ADAPTER = "vercel-blob";
    process.env.BLOB_PUBLIC_BASE_URL = "https://example.public.blob.vercel-storage.com";
    try {
      const blob = (await loadGetStorageAdapter())();
      expect(blob.urlFor("public", "media/abc.webp")).toBe(
        "https://example.public.blob.vercel-storage.com/public/media/abc.webp",
      );
    } finally {
      delete process.env.BLOB_PUBLIC_BASE_URL;
    }
  });

  it("비공개·임시 영역에는 어느 어댑터에서도 공개 주소를 만들지 않는다 (AD-011)", async () => {
    const getStorageAdapter = await loadGetStorageAdapter();
    const local = getStorageAdapter();
    expect(local.urlFor("private", "resume/a.pdf")).toBeNull();
    expect(local.urlFor("staging", "tmp/a")).toBeNull();
    expect(local.urlFor("public", "media/a.webp")).toBe("/uploads/media/a.webp");

    process.env.STORAGE_ADAPTER = "vercel-blob";
    const blob = (await loadGetStorageAdapter())();
    expect(blob.urlFor("private", "resume/a.pdf")).toBeNull();
    expect(blob.urlFor("staging", "tmp/a")).toBeNull();
  });
});

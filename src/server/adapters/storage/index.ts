import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";

export type StoredObject = {
  key: string;
  /** 공개 영역에 저장한 것만 주소를 갖는다. 비공개 영역은 `null` 이다. */
  url: string | null;
  sizeBytes: number;
  contentType: string;
};

/**
 * 저장 영역 구분.
 * - `public`: 공지 본문 이미지처럼 누구나 볼 수 있는 파일.
 * - `private`: 이력서처럼 관리자 인증 경로로만 내려받는 파일. 공개 주소를 만들지 않는다. (AD-011)
 */
export type StorageScope = "public" | "private";

export interface StorageAdapter {
  readonly name: "local";
  put(
    scope: StorageScope,
    key: string,
    body: Uint8Array,
    contentType: string,
  ): Promise<StoredObject>;
  get(scope: StorageScope, key: string): Promise<Uint8Array>;
  remove(scope: StorageScope, key: string): Promise<void>;
  /** 비공개 영역은 항상 `null` 이다. 공개 주소를 만들지 않는다. */
  urlFor(scope: StorageScope, key: string): string | null;
}

/**
 * 저장 키를 만든다. 올린 파일 이름은 키에 넣지 않는다.
 * 파일 이름에 개인정보가 들어 있을 수 있어서다. (BLUEPRINT 10장)
 */
export function createStorageKey(prefix: string, extension: string): string {
  const safePrefix = prefix.replace(/[^a-z0-9/-]/gi, "");
  const safeExtension = extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `${safePrefix}/${randomUUID()}${safeExtension ? `.${safeExtension}` : ""}`;
}

/** 키가 저장 영역 밖을 가리키지 못하게 한다. */
function resolveSafePath(root: string, key: string): string {
  const normalizedKey = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const target = resolve(root, normalizedKey);
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error("STORAGE_KEY_OUT_OF_SCOPE");
  }
  return target;
}

/**
 * 로컬 파일 저장 구현. 운영에서는 같은 인터페이스로 객체 저장소 어댑터를 끼운다. (ASM-008)
 * 비공개 영역은 `public/` 아래가 아니라 저장소 바깥 디렉터리에 둔다.
 */
class LocalStorageAdapter implements StorageAdapter {
  readonly name = "local" as const;

  private rootFor(scope: StorageScope): string {
    const base = process.env.STORAGE_ROOT ?? join(process.cwd(), ".storage");
    return resolve(join(base, scope));
  }

  async put(
    scope: StorageScope,
    key: string,
    body: Uint8Array,
    contentType: string,
  ): Promise<StoredObject> {
    const target = resolveSafePath(this.rootFor(scope), key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    return {
      key,
      url: this.urlFor(scope, key),
      sizeBytes: body.byteLength,
      contentType,
    };
  }

  async get(scope: StorageScope, key: string): Promise<Uint8Array> {
    const target = resolveSafePath(this.rootFor(scope), key);
    return new Uint8Array(await readFile(target));
  }

  async remove(scope: StorageScope, key: string): Promise<void> {
    const target = resolveSafePath(this.rootFor(scope), key);
    await rm(target, { force: true });
  }

  urlFor(scope: StorageScope, key: string): string | null {
    // 비공개 영역은 주소를 만들지 않는다. 관리자 인증 경로로만 내보낸다. (AD-011)
    if (scope === "private") return null;
    return `/uploads/${key}`;
  }
}

const localAdapter = new LocalStorageAdapter();

export function getStorageAdapter(): StorageAdapter {
  return localAdapter;
}

/** 같은 파일을 두 번 올렸는지 알아보는 용도. 내용 자체는 저장하지 않는다. */
export function hashContent(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

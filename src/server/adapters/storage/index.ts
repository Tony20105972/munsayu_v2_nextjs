import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { envValue, requireEnvValue } from "@/server/env";

export type StoredObject = {
  key: string;
  /** 공개 영역에 저장한 것만 주소를 갖는다. 비공개·임시 영역은 `null` 이다. */
  url: string | null;
  sizeBytes: number;
  contentType: string;
};

/**
 * 저장 영역 구분.
 * - `public`: 공지 본문 이미지·강사 사진처럼 누구나 볼 수 있는 파일. (AD-014, AD-015)
 * - `private`: 이력서처럼 관리자 인증 경로로만 내려받는 파일. 공개 주소를 만들지 않는다. (AD-011)
 * - `staging`: 브라우저가 저장소로 직접 올린 **검사 전** 원본이 잠깐 머무는 자리.
 *   공개 주소를 만들지 않고, 검사·변환이 끝나면 지운다. (AD-015)
 */
export type StorageScope = "public" | "private" | "staging";

/**
 * 브라우저가 저장소로 **직접** 파일을 올릴 수 있게 서버가 내주는 1회용 티켓.
 *
 * Vercel 함수는 요청 본문이 4.5MB 를 넘으면 413 으로 끊긴다
 * (https://vercel.com/docs/functions/limitations, 확인 2026-11-14).
 * 20MB 사진을 Server Action 으로 흘려보내면 운영에서 반드시 실패하므로,
 * 바이트는 함수를 거치지 않고 저장소로 바로 간다. 운영의 Vercel Blob 어댑터는
 * 같은 모양의 티켓(클라이언트 업로드 토큰)을 돌려준다. (ADR-008)
 */
export type DirectUploadTicket = {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  key: string;
  maxBytes: number;
  expiresAt: Date;
};

export interface StorageAdapter {
  readonly name: string;
  put(
    scope: StorageScope,
    key: string,
    body: Uint8Array,
    contentType: string,
  ): Promise<StoredObject>;
  get(scope: StorageScope, key: string): Promise<Uint8Array>;
  remove(scope: StorageScope, key: string): Promise<void>;
  /** 비공개·임시 영역은 항상 `null` 이다. 공개 주소를 만들지 않는다. */
  urlFor(scope: StorageScope, key: string): string | null;
  /** 브라우저가 바이트를 직접 보낼 자리를 내준다. 권한 확인은 부르는 쪽이 먼저 한다. */
  createUploadTicket(
    scope: StorageScope,
    key: string,
    options: { maxBytes: number; ttlSeconds?: number },
  ): Promise<DirectUploadTicket>;
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

const UPLOAD_TICKET_TTL_SECONDS = 15 * 60;

/**
 * 티켓 서명 키. `AUTH_SECRET` 에서 갈라 쓴다. 비밀값을 새로 늘리지 않는다.
 *
 * 값이 없으면 **던진다.** 빈 문자열로 넘어가면 서명 키가 누구나 계산할 수 있는 상수가
 * 되어 업로드 티켓을 위조할 수 있다. 관리자 세션이 한 겹 더 막지만, 비밀값이 없을 때는
 * 조용히 약해지는 대신 멈추는 쪽이 맞다.
 */
function ticketSigningKey(): Buffer {
  return createHash("sha256")
    .update(`${requireEnvValue("AUTH_SECRET")}:media-upload-ticket`)
    .digest();
}

function signTicket(
  scope: StorageScope,
  key: string,
  maxBytes: number,
  expiresAtMs: number,
): string {
  return createHmac("sha256", ticketSigningKey())
    .update(`${scope}\n${key}\n${maxBytes}\n${expiresAtMs}`)
    .digest("base64url");
}

export type VerifiedTicket = { scope: StorageScope; key: string; maxBytes: number };

/**
 * 로컬 어댑터가 내준 티켓을 확인한다. 서명·만료·영역을 모두 본다.
 * 서명이 맞아도 올리는 쪽의 관리자 권한은 **따로** 확인한다. 티켓만으로는 통과하지 않는다.
 */
export function verifyUploadTicket(params: {
  scope: string;
  key: string;
  maxBytes: string;
  expiresAt: string;
  signature: string;
  now?: Date;
}): VerifiedTicket | null {
  if (params.scope !== "staging") return null;

  const maxBytes = Number.parseInt(params.maxBytes, 10);
  const expiresAtMs = Number.parseInt(params.expiresAt, 10);
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) return null;
  if (!Number.isSafeInteger(expiresAtMs)) return null;
  if ((params.now ?? new Date()).getTime() > expiresAtMs) return null;

  const expected = signTicket("staging", params.key, maxBytes, expiresAtMs);
  const given = Buffer.from(params.signature, "utf8");
  const want = Buffer.from(expected, "utf8");
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  return { scope: "staging", key: params.key, maxBytes };
}

/**
 * 로컬 파일 저장 구현. 운영에서는 같은 인터페이스로 Vercel Blob 어댑터를 끼운다.
 * (Phase 7, ASM-008 · ADR-008)
 *
 * 비공개·임시 영역은 `public/` 아래가 아니라 저장소 바깥 디렉터리에 둔다.
 */
class LocalStorageAdapter implements StorageAdapter {
  readonly name = "local" as const;

  private rootFor(scope: StorageScope): string {
    const base = envValue("STORAGE_ROOT") ?? join(process.cwd(), ".storage");
    /*
     * 경로를 설정값으로 만들기 때문에 번들러가 "어느 파일을 읽을지 모르겠다"고 보고
     * `public/` 까지 포함한 저장소 전체를 함수 번들에 넣는다. 그러면 배포가 느려지고
     * 함수 크기 제한(250MB)에 걸릴 수 있다.
     *
     * 이 어댑터는 로컬 개발용이고 운영에서는 Blob 어댑터가 들어온다(Phase 7). 그래서
     * 추적을 끈다. 경로가 저장 영역 밖을 가리키지 못하는 것은 `resolveSafePath` 가 막는다.
     */
    const root = join(/* turbopackIgnore: true */ base, scope);
    return resolve(/* turbopackIgnore: true */ root);
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
    // 비공개·임시 영역은 주소를 만들지 않는다. 관리자 인증 경로로만 내보낸다. (AD-011)
    if (scope !== "public") return null;
    return `/uploads/${key}`;
  }

  async createUploadTicket(
    scope: StorageScope,
    key: string,
    options: { maxBytes: number; ttlSeconds?: number },
  ): Promise<DirectUploadTicket> {
    // 로컬에는 서명된 저장소 주소가 없으므로 우리 경로를 쓴다.
    // 그 경로도 관리자 세션을 다시 확인하고 티켓 서명을 검사한다.
    const expiresAt = new Date(
      Date.now() + (options.ttlSeconds ?? UPLOAD_TICKET_TTL_SECONDS) * 1000,
    );
    const signature = signTicket(scope, key, options.maxBytes, expiresAt.getTime());
    const query = new URLSearchParams({
      scope,
      key,
      maxBytes: String(options.maxBytes),
      expiresAt: String(expiresAt.getTime()),
      signature,
    });

    return {
      url: `/api/admin/media/direct-upload?${query.toString()}`,
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      key,
      maxBytes: options.maxBytes,
      expiresAt,
    };
  }
}

const localAdapter = new LocalStorageAdapter();

export function getStorageAdapter(): StorageAdapter {
  // 지금은 로컬 구현 하나뿐이다. 운영 전환은 Phase 7에서 이 분기만 늘린다. (ADR-008)
  return localAdapter;
}

/** 같은 파일을 두 번 올렸는지 알아보는 용도. 내용 자체는 저장하지 않는다. */
export function hashContent(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

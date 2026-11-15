import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { del, get, issueSignedToken, presignUrl, put } from "@vercel/blob";
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

/**
 * Vercel Blob 저장 구현. 운영·스테이징에서 쓴다. (ASM-008 · ADR-008 · Phase 7)
 *
 * 로컬 어댑터와 다른 점은 두 가지다.
 *
 * 1. **바이트가 우리 함수를 지나가지 않는다.** 올릴 자리는 Blob 이 서명한 `PUT` 주소다.
 *    Vercel 함수 본문 상한(4.5MB)과 무관해져 20MB 사진도 올라간다. 용량 상한은
 *    주소를 만들 때 `maximumSizeInBytes` 로 **저장소가** 지킨다. 우리 쪽 검사가
 *    아니라 저장소 쪽 검사이므로 브라우저가 우회할 수 없다.
 * 2. **공개·비공개가 저장소 수준으로 갈린다.** 이력서(`private`)와 검사 전 원본
 *    (`staging`)은 `access: "private"` 으로 올라가 공개 주소가 아예 생기지 않는다.
 *    공개 사진만 `access: "public"` 으로 올려 Blob CDN 이 직접 내려 준다.
 *    (`next.config.ts` 의 `remotePatterns` 와 `proxy.ts` 의 `img-src` 가 그 호스트를 허용한다)
 *
 * 비밀값은 `BLOB_READ_WRITE_TOKEN`(또는 Vercel 의 OIDC + `BLOB_STORE_ID`)을 SDK 가
 * 환경 변수에서 직접 읽는다. 이 파일은 토큰을 읽지도, 로그에 남기지도 않는다.
 */
class VercelBlobStorageAdapter implements StorageAdapter {
  readonly name = "vercel-blob" as const;

  /** 공개 영역만 `public`. 비공개·임시는 저장소 수준에서 비공개다. */
  private accessFor(scope: StorageScope): "public" | "private" {
    return scope === "public" ? "public" : "private";
  }

  /**
   * 저장소 안의 경로. 영역을 맨 앞에 붙여 공개·비공개 파일이 섞이지 않게 한다.
   *
   * 영역 밖을 가리키는 키는 **조용히 고치지 않고 거절한다.** 고쳐서 쓰면
   * `private/../public/x` 가 `public/x` 로 바뀌어, 비공개로 올린 줄 알았던 파일이
   * 공개 영역에 들어갈 수 있다. 로컬 어댑터(`resolveSafePath`)도 같은 규칙으로 던진다.
   */
  private pathnameFor(scope: StorageScope, key: string): string {
    const normalizedKey = normalize(key);
    if (
      normalizedKey === ".." ||
      normalizedKey.startsWith("../") ||
      normalizedKey.startsWith("..\\") ||
      normalizedKey.startsWith("/") ||
      normalizedKey.startsWith("\\") ||
      normalizedKey.length === 0 ||
      normalizedKey === "."
    ) {
      throw new Error("STORAGE_KEY_OUT_OF_SCOPE");
    }
    return `${scope}/${normalizedKey}`;
  }

  async put(
    scope: StorageScope,
    key: string,
    body: Uint8Array,
    contentType: string,
  ): Promise<StoredObject> {
    /*
     * SDK 는 `Buffer` 를 받는다. 복사 없이 같은 메모리를 가리키게 감싼다.
     * 사진이 20MB 까지 올 수 있어 한 번 더 복사하는 비용을 피한다.
     */
    const buffer = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
    const result = await put(this.pathnameFor(scope, key), buffer, {
      access: this.accessFor(scope),
      contentType,
      /*
       * 키는 우리가 UUID 로 만든다(`createStorageKey`). 저장소가 접미사를 더 붙이면
       * DB 에 적어 둔 키로 다시 찾을 수 없다.
       */
      addRandomSuffix: false,
      /*
       * 같은 키로 다시 올리는 경우는 재시도뿐이다. 기본값(`false`)이면 재시도가
       * 충돌로 실패한다. 키가 UUID 라 다른 파일을 덮어쓸 일은 없다.
       */
      allowOverwrite: true,
    });

    return {
      key,
      // 공개 주소는 저장소가 돌려준 값을 그대로 쓴다. 우리가 조립하지 않는다.
      url: scope === "public" ? result.url : null,
      sizeBytes: body.byteLength,
      contentType,
    };
  }

  async get(scope: StorageScope, key: string): Promise<Uint8Array> {
    const result = await get(this.pathnameFor(scope, key), {
      access: this.accessFor(scope),
      /*
       * 방금 올린 임시 원본을 바로 읽는다. CDN 캐시를 거치면 아직 없다고 나올 수
       * 있어서 원본 저장소에서 읽는다.
       */
      useCache: false,
    });

    if (!result || result.statusCode !== 200) {
      throw new Error("STORAGE_OBJECT_NOT_FOUND");
    }
    const buffer = await new Response(result.stream).arrayBuffer();
    return new Uint8Array(buffer);
  }

  async remove(scope: StorageScope, key: string): Promise<void> {
    // 없는 파일을 지워도 오류가 아니다. 로컬 어댑터의 `rm(..., { force: true })` 와 같다.
    await del(this.pathnameFor(scope, key));
  }

  urlFor(scope: StorageScope, key: string): string | null {
    // 비공개·임시 영역은 주소를 만들지 않는다. 관리자 인증 경로로만 내보낸다. (AD-011)
    if (scope !== "public") return null;
    /*
     * 공개 주소의 호스트는 저장소마다 다르고 저장소 ID 에서 계산할 수 없다.
     * 그래서 `put()` 이 돌려준 주소를 쓰는 것이 정답이고, 이 함수는 그 주소를
     * 다시 만들어야 하는 자리에서만 쓴다. 기준 주소를 넣어 두지 않았으면
     * 조용히 `null` 을 주지 않고 **멈춘다.** 깨진 사진 주소를 DB 에 적는 것보다 낫다.
     */
    // 키 검사를 먼저 한다. 설정이 있든 없든 잘못된 키는 거절해야 한다.
    const pathname = this.pathnameFor(scope, key);
    const base = envValue("BLOB_PUBLIC_BASE_URL");
    if (!base) throw new Error("BLOB_PUBLIC_BASE_URL_MISSING");
    return `${base.replace(/\/$/, "")}/${pathname}`;
  }

  async createUploadTicket(
    scope: StorageScope,
    key: string,
    options: { maxBytes: number; ttlSeconds?: number },
  ): Promise<DirectUploadTicket> {
    const pathname = this.pathnameFor(scope, key);
    const validUntil =
      Date.now() + (options.ttlSeconds ?? UPLOAD_TICKET_TTL_SECONDS) * 1000;

    /*
     * 티켓은 이 **한 경로**, **올리기 한 가지**, **이 용량까지**로 좁힌다.
     * 티켓이 새어 나가도 다른 파일을 읽거나 지우거나 큰 파일을 밀어 넣을 수 없다.
     */
    const signedToken = await issueSignedToken({
      pathname,
      operations: ["put"],
      validUntil,
      maximumSizeInBytes: options.maxBytes,
    });

    const { presignedUrl } = await presignUrl(signedToken, {
      operation: "put",
      pathname,
      access: this.accessFor(scope),
      validUntil,
      maximumSizeInBytes: options.maxBytes,
      addRandomSuffix: false,
      allowOverwrite: true,
      /*
       * 검사 전 원본은 하루 뒤 저장소가 스스로 지운다. 보관함에 등록이 끝나면
       * 우리가 바로 지우지만(`finalizeMediaUpload`), 사용자가 창을 닫거나 등록이
       * 실패하면 아무도 지우지 않는 원본이 남는다. 비공개여도 검사하지 않은 파일을
       * 영구히 두지 않는다. 공개 영역에는 수명을 두지 않는다.
       */
      ...(scope === "staging" ? { ttlDays: 1 } : {}),
    });

    return {
      url: presignedUrl,
      method: "PUT",
      /*
       * 헤더를 지정하지 않는다. 브라우저가 고른 `Content-Type` 이 그대로 가고,
       * 형식은 어차피 바이트를 보고 다시 판별한다(ASM-085, `normalizeUploadedImage`).
       */
      headers: {},
      key,
      maxBytes: options.maxBytes,
      expiresAt: new Date(validUntil),
    };
  }
}

const localAdapter = new LocalStorageAdapter();
const vercelBlobAdapter = new VercelBlobStorageAdapter();

/**
 * `STORAGE_ADAPTER` 로 저장 구현을 고른다. 비어 있으면 로컬이다(개발 기본값).
 *
 * 모르는 이름이면 **던진다.** 오타 하나로 운영이 조용히 로컬 파일 저장으로 떨어지면
 * 올린 사진이 배포마다 사라진다(Vercel 함수의 파일 시스템은 요청이 끝나면 없어진다).
 */
export function getStorageAdapter(): StorageAdapter {
  const selected = envValue("STORAGE_ADAPTER") ?? "local";
  switch (selected) {
    case "local":
      return localAdapter;
    case "vercel-blob":
      return vercelBlobAdapter;
    default:
      throw new Error(`UNKNOWN_STORAGE_ADAPTER:${selected}`);
  }
}

/** 같은 파일을 두 번 올렸는지 알아보는 용도. 내용 자체는 저장하지 않는다. */
export function hashContent(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

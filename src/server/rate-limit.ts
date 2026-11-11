import "@/server/server-only";
import { createHash } from "node:crypto";
import { rateLimited } from "@/server/errors";

/**
 * 공개 제출·조회 경로의 요청 횟수 제한.
 * 프로세스 안 메모리만 쓰므로 서버 인스턴스가 여러 개면 인스턴스별로 따로 센다.
 * 운영에서 더 엄격한 제한이 필요하면 공용 저장소(예: Redis) 기반으로 바꾼다. // ASM-022
 */
type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();

export const PUBLIC_RATE_LIMIT = { limit: 60, windowMs: 60_000 } as const;

/** 요청자 식별값(IP)은 원문으로 남기지 않고 해시만 키로 쓴다. */
function requesterKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number = PUBLIC_RATE_LIMIT.limit,
  windowMs: number = PUBLIC_RATE_LIMIT.windowMs,
): void {
  const key = `${scope}:${requesterKey(request)}`;
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((at) => now - at < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    throw rateLimited();
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
}

/** 테스트에서 프로세스 안 카운터를 초기화한다. */
export function resetRateLimits(): void {
  buckets.clear();
}

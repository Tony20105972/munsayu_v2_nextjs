import "@/server/server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 세션·재설정 토큰은 32바이트 난수다. 원문은 저장하지 않는다. */
export function createToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * 식별자(아이디 등)를 그대로 저장하지 않기 위한 해시.
 * AUTH_SECRET을 pepper로 섞어 사전 대조를 어렵게 한다.
 */
export function hashIdentifier(identifier: string): string {
  const pepper = process.env.AUTH_SECRET ?? "";
  return createHash("sha256")
    .update(`${pepper}:${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

/** 비밀값 비교는 길이 차이까지 숨기기 위해 해시를 거쳐 상수 시간으로 비교한다. */
export function secretEquals(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

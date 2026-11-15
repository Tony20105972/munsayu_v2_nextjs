import "server-only";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { passwordSchema } from "@/lib/contracts";

/**
 * 비밀번호는 argon2id로 저장한다. // ASM-014
 * 설정값은 OWASP 권고(m=19MiB, t=2, p=1)를 따른다. 근거와 대안은
 * docs/decisions/ADR-005-auth-and-password-hashing.md 에 있다.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(storedHash, password);
  } catch {
    // 해시 형식이 깨진 경우에도 자격 증명 불일치와 같게 다룬다.
    return false;
  }
}

/**
 * 사람이 받아 적을 임시 비밀번호. (AD-016 · `scripts/bootstrap-admin.ts`)
 *
 * 헷갈리는 글자(0·O·1·l·I)를 뺀다. 24자면 받아 적기 번거롭지 않으면서 추측으로는
 * 뚫리지 않는다.
 *
 * `byte % alphabet.length` 로 고르면 앞쪽 글자가 조금 더 자주 나온다(256 이 56 의
 * 배수가 아니다). 임시 비밀번호라 실질 위험은 작지만 치우치지 않게 뽑는 비용도 작으므로
 * 남는 범위에 걸린 바이트는 버리고 다시 뽑는다.
 *
 * 뽑은 값이 `passwordSchema`(영문과 숫자를 함께)를 만족할 때까지 다시 뽑는다. 알파벳
 * 56자 중 숫자가 8자뿐이라 24자를 뽑아도 숫자가 하나도 없을 확률이 (48/56)^24 ≈ 2% 다.
 * 그 2% 는 **비밀번호를 바꾸려 할 때 거부당하는 계정**이 된다.
 */
export function generateTemporaryPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const out: string[] = [];
    while (out.length < 24) {
      for (const byte of randomBytes(32)) {
        if (byte >= limit) continue;
        out.push(alphabet[byte % alphabet.length]);
        if (out.length === 24) break;
      }
    }
    const candidate = out.join("");
    if (passwordSchema.safeParse(candidate).success) return candidate;
  }

  throw new Error("TEMPORARY_PASSWORD_GENERATION_FAILED");
}

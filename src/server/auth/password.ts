import "server-only";
import argon2 from "argon2";

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

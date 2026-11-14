import "server-only";

/**
 * 환경 변수 읽기의 단일 지점.
 *
 * 배포 플랫폼·CI·`.env` 는 "키는 있는데 값이 비어 있는" 상태를 쉽게 만든다
 * (`SEED_ADMIN_PASSWORD=` 처럼 한 줄만 남은 경우). 그때 `process.env.X ?? 기본값`
 * 은 `undefined` 가 아니라 빈 문자열을 집어 기본값을 건너뛴다. 빈 비밀번호를
 * 해시하거나 빈 경로로 파일을 쓰는 사고가 여기서 나온다.
 *
 * 그래서 **공백만 있는 값은 "값 없음"으로 본다.** 양끝 공백도 함께 떼어낸다.
 */
export function envValue(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** 값이 없으면 기본값을 쓴다. 빈 문자열도 "값 없음"이다. */
export function envValueOr(name: string, fallback: string): string {
  return envValue(name) ?? fallback;
}

/**
 * 반드시 있어야 하는 값. 없으면 키 이름만 담아 던진다.
 * **값은 절대 메시지에 넣지 않는다.** (CLAUDE.md 4장)
 */
export function requireEnvValue(name: string): string {
  const value = envValue(name);
  if (value === undefined) {
    throw new Error(`환경 변수 ${name} 이 비어 있습니다. .env 를 확인해 주세요.`);
  }
  return value;
}

import { execFileSync } from "node:child_process";
import "dotenv/config";

/**
 * 통합 테스트 시작 전에 테스트 DB에 마이그레이션을 적용한다.
 * 연결 문자열은 `DATABASE_URL_TEST`만 쓴다. 개발 DB를 건드리지 않기 위한 분리다. (ASM-012)
 */
export default function globalSetup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST가 없습니다. .env.example을 참고해 테스트 DB 연결 문자열을 설정하세요.",
    );
  }
  // `migrate deploy`는 prisma.config.ts의 DATABASE_URL을 읽으므로 환경 변수로만 넘긴다.
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "dotenv/config";

/**
 * 테스트 파일이 로드되기 전에 `DATABASE_URL`을 테스트 DB로 바꾼다.
 * 서버 코드는 `DATABASE_URL`만 보므로 이 치환으로 개발 DB를 건드리지 않는다. (ASM-012)
 */
const url = process.env.DATABASE_URL_TEST;
if (!url) {
  throw new Error("DATABASE_URL_TEST가 없습니다. 통합 테스트를 실행할 수 없습니다.");
}
process.env.DATABASE_URL = url;
process.env.MAIL_ADAPTER = "memory";
process.env.NOTIFY_ADAPTER = "memory";
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-only-secret";
process.env.PRIVACY_PURGE_SECRET =
  process.env.PRIVACY_PURGE_SECRET ?? "test-only-purge-secret";

// 올린 파일(이력서·공지 첨부)이 저장소 폴더를 더럽히지 않도록 임시 폴더로 보낸다. (AD-011)
process.env.STORAGE_ROOT = mkdtempSync(join(tmpdir(), "munsayu-test-storage-"));

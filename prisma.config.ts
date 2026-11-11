import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7부터 연결 문자열은 스키마가 아니라 이 파일에 둔다. Prisma 7은 `.env`를 자동으로 읽지 않으므로
 * dotenv를 직접 불러온다. 런타임 클라이언트는 드라이버 어댑터로 직접 연결한다. (src/server/db.ts)
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DATABASE_URL") },
});

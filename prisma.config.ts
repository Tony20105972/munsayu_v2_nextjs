import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7부터 연결 문자열은 스키마가 아니라 이 파일에 둔다. Prisma 7은 `.env`를 자동으로 읽지 않으므로
 * dotenv를 직접 불러온다. 런타임 클라이언트는 드라이버 어댑터로 직접 연결한다. (src/server/db.ts)
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  // seed는 Next 번들러 밖(node)에서 돌기 때문에 `server-only`를 해석할 수 있도록
  // react-server 조건을 켠다. 이게 없으면 서버 모듈을 import하는 순간 실패한다.
  migrations: { seed: "tsx --conditions=react-server prisma/seed.ts" },
  datasource: { url: env("DATABASE_URL") },
});

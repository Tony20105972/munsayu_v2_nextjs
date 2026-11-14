import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7부터 연결 문자열은 스키마가 아니라 이 파일에 둔다. Prisma 7은 `.env`를 자동으로 읽지 않으므로
 * dotenv를 직접 불러온다. 런타임 클라이언트는 드라이버 어댑터로 직접 연결한다. (src/server/db.ts)
 *
 * `prisma generate`는 DB에 붙지 않는다. 그런데 `env("DATABASE_URL")`을 쓰면 Prisma가 설정을 읽는
 * 순간 변수를 찾지 못해 `PrismaConfigEnvError`로 멈춘다. `npm ci`의 postinstall이 바로 이 경로라서
 * DATABASE_URL이 없는 CI·빌드 단계가 전부 깨진다. 그래서 여기서는 변수를 직접 읽고, 없으면 빈
 * 문자열을 둔다. 연결이 필요한 명령(`migrate`·`db`·`studio`)은 Prisma가 빈 주소로 실패한다.
 * 빈 문자열(`DATABASE_URL=`)은 "값 없음"으로 본다.
 */
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // seed는 Next 번들러 밖(node)에서 돌기 때문에 `server-only`를 해석할 수 있도록
  // react-server 조건을 켠다. 이게 없으면 서버 모듈을 import하는 순간 실패한다.
  migrations: { seed: "tsx --conditions=react-server prisma/seed.ts" },
  datasource: { url: databaseUrl },
});

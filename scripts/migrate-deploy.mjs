#!/usr/bin/env node
/**
 * 배포할 때 미적용 마이그레이션을 적용한다. (Phase 7)
 *
 * Neon 같은 관리형 PostgreSQL 은 주소를 두 개 준다.
 *  - `DATABASE_URL`           연결 풀(pgBouncer)을 거치는 주소. 런타임이 쓴다.
 *  - `DATABASE_URL_UNPOOLED`  데이터베이스에 바로 붙는 주소.
 *
 * 마이그레이션은 **직접 접속 주소**로 해야 한다. Prisma 가 동시 실행을 막기 위해
 * 세션 수준 권고 잠금(advisory lock)을 쓰는데, 연결 풀은 문장마다 다른 연결을 줄 수
 * 있어 잠금을 건 연결과 푸는 연결이 달라지고 배포가 멈춘다.
 *
 * 직접 접속 주소가 없는 환경(로컬·CI)에서는 `DATABASE_URL` 을 그대로 쓴다.
 * 주소 값은 찍지 않는다. 어느 키를 썼는지만 남긴다. (CLAUDE.md 4장)
 *
 * **Preview 배포에서는 돌리지 않는다.** Preview 는 모든 브랜치에서 올라가고(`vercel.json`),
 * 지금은 운영과 **같은 데이터베이스**를 쓴다. 가드가 없으면 아직 병합하지 않은 브랜치를
 * 푸시하는 것만으로 운영 스키마가 바뀌고, 그건 배포 되돌리기로 **되돌아가지 않는다**
 * (`docs/rollback-plan.md` 3-1). 그래서 Vercel 에서는 `VERCEL_ENV=production` 일 때만 적용한다.
 * 운영 DB 를 Preview 와 분리하면(`docs/migration-checklist.md` 1-7) 이 가드를 다시 본다.
 */
// Prisma 7 은 `.env` 를 자동으로 읽지 않는다. `prisma.config.ts` 와 같은 방식으로 직접 읽는다.
// Vercel 빌드에는 `.env` 파일이 없고(저장소에 커밋하지 않는다) 환경 변수가 직접 들어오므로
// 이 줄은 아무 일도 하지 않는다.
import "dotenv/config";
import { spawnSync } from "node:child_process";

const trimmed = (name) => {
  const raw = process.env[name];
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.length > 0 ? value : undefined;
};

/*
 * `VERCEL_ENV` 는 Vercel 빌드에서만 있다(`production` | `preview` | `development`).
 * 로컬·CI 에는 없으므로 그때는 막지 않는다.
 */
const vercelEnv = trimmed("VERCEL_ENV");
if (vercelEnv && vercelEnv !== "production") {
  console.log(
    `[migrate-deploy] VERCEL_ENV=${vercelEnv} 이라 마이그레이션을 건너뜁니다. ` +
      "Production 배포에서만 적용합니다.",
  );
  process.exit(0);
}

const direct = trimmed("DATABASE_URL_UNPOOLED") ?? trimmed("POSTGRES_URL_NON_POOLING");
const pooled = trimmed("DATABASE_URL");
const url = direct ?? pooled;

if (!url) {
  console.error(
    "[migrate-deploy] DATABASE_URL 이 비어 있어 마이그레이션을 건너뜁니다. 환경 변수를 확인해 주세요.",
  );
  process.exit(1);
}

console.log(
  `[migrate-deploy] ${direct ? "DATABASE_URL_UNPOOLED(직접 접속)" : "DATABASE_URL"} 로 마이그레이션을 적용합니다.`,
);

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});

process.exit(result.status ?? 1);

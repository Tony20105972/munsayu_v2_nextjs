import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * unit: DB 없이 도는 순수 로직 테스트.
 * integration: 실제 PostgreSQL에 붙는 기능 ID별 테스트. `DATABASE_URL_TEST`가 필요하다. (ASM-012)
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only`은 Next 번들러 전용 조건부 모듈이라 Vitest(node)에서 그대로 import하면
      // 즉시 예외를 던진다. 서버 코드가 CLAUDE.md 7장대로 `import "server-only"`를 유지할 수 있게
      // 테스트에서는 Next가 번들러에 쓰는 빈 모듈로 바꿔 준다.
      "server-only": fileURLToPath(
        new URL(
          "./node_modules/next/dist/compiled/server-only/empty.js",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});

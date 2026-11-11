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

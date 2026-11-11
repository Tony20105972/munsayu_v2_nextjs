# Phase 3·4 파일 소유권

| 영역 | 소유 | 경계 |
|---|---|---|
| `app/(public)/**`, `src/components/**`, `public/**`, `tests/visual/**`, `app/globals.css`, `app/layout.tsx` | Phase 3 FE | API 구현·Prisma 변경 금지 |
| `app/api/**`, `app/admin/**`, `src/server/**`, `prisma/**`, `tests/integration/**` | Phase 4 BE | 공개 화면 구현 변경 금지 |
| `src/lib/contracts/**`, `docs/contracts/openapi.yaml`, `docs/contracts/architecture.md` | 공유 | 먼저 계약 문서 변경 → `src/lib/contracts/` 반영 → ADR 기록 |
| `package.json`, `vitest.config.ts`, `playwright.config.ts`, `next.config.ts`, `tsconfig.json`, `.github/workflows/**`, `.env.example`, `.gitignore` | 조정자 | FE·BE는 필요 사항을 보고하고 조정자가 반영 |
| `tests/e2e/**` | 조정자 | 통합(C-3) 단계에서 작성 |
| `docs/reports/migration-status.md`, `docs/PHASE.md`, `docs/reports/open-questions.md` | 조정자 | 기능 완료·상태 변경 때만 갱신 |

- 같은 파일을 양쪽이 고치지 않는다. 표에 없는 파일이 필요하면 조정자가 소유자를 정하고 이 표를 갱신한다.
- FE는 BE 구현이 준비되기 전에는 계약 타입을 따르는 스텁을 쓰고 `STUB` 주석을 남긴다. 통합 단계에서 0건이어야 한다.

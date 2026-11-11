# Phase 3·4 파일 소유권

| 영역 | 소유 | 경계 |
|---|---|---|
| `app/(public)/**`, `app/layout.tsx`, `app/globals.css`, `middleware.ts` | Phase 3 FE | API 구현·Prisma 변경 금지 |
| `app/admin/**` (관리자 **화면**), `src/components/**`, `src/lib/**`(contracts 제외), `public/**`, `tests/visual/**` | Phase 3 FE | 서버 서비스 구현 금지. BE 준비 전에는 계약 타입을 따르는 `STUB` 데이터 |
| `app/api/**`(관리자 API 포함), `src/server/**`, `prisma/**`, `tests/integration/**` | Phase 4 BE | 공개·관리자 **화면** 파일 생성·수정 금지 |
| `src/lib/contracts/**`, `docs/contracts/openapi.yaml`, `docs/contracts/architecture.md` | 공유 | 먼저 계약 문서 변경 → `src/lib/contracts/` 반영 → ADR 기록. 양쪽 모두 단독 변경 금지 |
| `package.json`, `vitest.config.mts`, `playwright.config.ts`, `next.config.ts`, `tsconfig.json`, `prisma.config.ts`, `.github/workflows/**`, `.env.example`, `.gitignore` | 조정자 | FE·BE는 필요 사항을 작업 노트에 적고 조정자가 반영 |
| `tests/e2e/**` | 조정자 | 통합(C-3) 단계에서 작성 |
| `docs/reports/migration-status.md`, `docs/PHASE.md`, `docs/reports/open-questions.md`, `docs/decisions/**` | 조정자 | FE는 `docs/reports/phase-3-fe-notes.md`, BE는 `docs/reports/phase-4-be-notes.md`에 ASM 후보를 적고 조정자가 옮긴다 |

## 결정 기록

- `app/admin/**`은 Phase 2 초안에서 BE 소유였으나, 관리자 화면 구현이 Phase 3 지시에 포함되어 **화면은 FE, 관리자 API는 BE**로 나눈다. 두 쪽이 같은 파일을 고치지 않게 하기 위한 분리다.
- FE는 BE 구현이 준비되기 전에는 계약 타입을 따르는 스텁을 쓰고 `STUB` 주석을 남긴다. 통합 단계에서 `grep -rn "STUB"` 결과가 0건이어야 한다.
- 표에 없는 파일이 필요하면 조정자가 소유자를 정하고 이 표를 갱신한다.

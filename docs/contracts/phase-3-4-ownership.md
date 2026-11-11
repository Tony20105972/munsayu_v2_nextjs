# Phase 3·4 파일 소유권 초안

| 영역 | 소유 | 경계 |
|---|---|---|
| `app/(public)/**`, `src/components/**`, `public/**`, `tests/visual/**` | Phase 3 FE | API 구현·Prisma 변경 금지 |
| `app/api/**`, `app/admin/**`, `src/server/**`, `prisma/**`, `tests/integration/**` | Phase 4 BE | 공개 화면 구현 변경 금지 |
| `src/lib/contracts/**`, `docs/contracts/openapi.yaml` | 공유 | 먼저 계약 변경·양쪽 검토·사람 승인 |
| `docs/reports/migration-status.md` | 조정자 | 기능 완료 때만 갱신 |

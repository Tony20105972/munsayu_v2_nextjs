# Phase 2 보고서 — Migration Contract

- 완료한 작업: 레거시 URL 호환 맵, React 컴포넌트 트리, 신청·예약·회원 입력/상태 계약, PostgreSQL Prisma 스키마, Route Handler OpenAPI, 리스크·SEO·이미지 전략, Phase 3·4 소유권 표를 작성했다. 구현 코드는 `prisma/schema.prisma` 외 작성하지 않았다.
- 변경한 파일: `AGENTS.md`, `CLAUDE.md`, `docs/PHASE.md`, `docs/BLUEPRINT.md`, `docs/MIGRATION_PLAN.md`, `docs/decisions/ADR-003-phase-2-decisions-and-asm-policy.md`, `docs/contracts/*`, `docs/reports/open-questions.md`, `docs/reports/phase-2-review.md`, `prisma/schema.prisma`.
- 이관된 PHP 기능: 계약 범위는 `PG-001~014`, `FM-001~003`, `BZ-001~002`, `AD-001~009,012~013`, `RT-001~003`이다. `AD-010~011`은 공개 계약 증거가 없어 ASM-007에 따라 제외했다.

## 결정과 ASM

- ADR-003: D1 이관 데이터·원본 사진 없음, D2 PostgreSQL+Prisma 신규, D4 알림 콘솔 어댑터, D5 단일 관리자, 수동 마감·정원 미강제, AD-002/013 이관을 기록했다.
- D3 기본안(ASM-008): Vercel을 전제로 DB·저장소를 어댑터 분리하고 local은 Docker PostgreSQL이다.
- ASM-001~009의 근거·반영 위치·변경 방법·쉬운 질문은 `open-questions.md`에 있다.

### D3 관리형 서비스 비교

| 선택지 | Vercel 연동 | PostgreSQL | 이미지 저장소 | 판단 |
|---|---|---|---|---|
| Vercel + Neon | 간단한 서버리스 연동 | 서버리스 Postgres | Vercel Blob 또는 S3 호환 | 기본안: 소규모 시작에 단순 |
| Vercel + Supabase | 환경 변수 연결 | Postgres·관리 UI | Supabase Storage | DB와 파일을 한 콘솔에서 관리하려면 적합 |
| Vercel + AWS RDS/S3 | 별도 네트워크·운영 필요 | 관리형 Postgres | S3 | 운영 제어는 크나 초기 복잡도 큼 |

서비스 선택·비용·계정 생성은 사람 승인 전 수행하지 않는다. `StorageAdapter`와 DB 접근 계층으로 교체 가능하게 설계했다.

## 독립 리뷰와 보정

작업 맥락을 받지 않은 리뷰어가 `phase-2-review.md`를 작성했다. 차단 3건(동시 중복 원자성, 파기 대상/정책 버전, 예약 조회·취소 API 입력)을 보정했다: PostgreSQL SERIALIZABLE + 대상 행 잠금 계약, `purgeEligibleAt`/`retentionPolicyVersion`, OpenAPI request·path·422·no-store 계약을 추가했다. 권장 PII 주석과 admin 403/no-store도 반영했다.

## 실행한 검증

- `DATABASE_URL='postgresql://user:pass@localhost:5432/munsayu' npx -y prisma@6.19.2 validate --schema prisma/schema.prisma` — 통과.
- `node -e "JSON.parse(...)"`로 `route-compatibility-map.json` 파싱 — 통과.
- `git diff --check` — 통과.

## 남은 UNKNOWN / 알려진 한계

- AD-010 문자신청내역과 AD-011 강사지원 공개 화면·입력 계약은 미관찰이라 범위 제외(ASM-007)다.
- 설명회 보존 완료 시점·회원의 실제 추가 필드는 ASM 질문으로 남겼다.
- D6 이미지·폰트 권리는 미확인이라 레거시 raw 자산을 커밋하거나 사용하지 않았다.

## Phase 3·4 착수 전 사람이 할 일

1. `open-questions.md`의 ASM-007, ASM-009 우선 질문에 답하거나 현 기본안을 승인한다.
2. D3의 관리형 서비스 조합 및 D6 자산 권리를 결정한다.
3. Phase 2 계약과 보고서를 검토하고 Phase 3·4 병렬 착수를 승인한다. main 병합은 승인 전 금지다.

## Gate: PASS

- 모든 레거시 URL: `route-compatibility-map.json`에 유지/308/410/외부 유지 지정 — PASS.
- 모든 기능 ID와 테스트 계약: `migration-matrix.md` — PASS.
- 수동 마감 상태와 중복 트랜잭션: `architecture.md` — PASS.
- D1~D5 ADR: ADR-003 — PASS (D3는 ASM-008 기본안).
- PII·보존 기간: Prisma 주석·설정·정책 버전·파기 대상 시각 — PASS.
- BLUEPRINT 관리자 기능 테스트 계약: matrix — PASS.
- AD-002/012 확정, AD-009 외부 링크, AD-010/011 ASM 범위 제외 — PASS.

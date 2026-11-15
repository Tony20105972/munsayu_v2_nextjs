# Phase 7 보고 — Cutover 준비

> 작성 2026-11-15 · 브랜치 `release/phase-7` · 상태 **`GATE_FAIL`** (Gate 1/5 통과 + 1건 부분)
> **실제 전환은 하지 않았습니다.** 도메인·DNS·레거시 사이트·운영 배포를 건드리지 않았습니다.

---

## 1. 한 일

### 1-1. Phase 6 승인·병합

- PR #7 `feat: Phase 6 — 성능·보안` 을 **squash 병합**했습니다 (merge commit `ee46bf6`).
- 병합 전 `verify` CI 가 최신 커밋 기준으로 **통과**(4분 14초)한 것을 확인했습니다.
  GitGuardian 도 pass 였습니다.
- `PHASE.md` 에 Phase 6 `APPROVED`·사람 승인 ☑ 를 **사용자 지시에 따라** 기록하고,
  Phase 7 을 `IN_PROGRESS` 로 바꾸고 `main` 에서 `release/phase-7` 브랜치를 만들었습니다.

### 1-2. 스테이징 — 환경 변수 확인까지만

Vercel 프로젝트 `munsayu-v2-nextjs` 의 환경 변수를 **이름만** 확인했습니다 (값은 보지 않음).

| 확인한 것 | 결과 |
|---|---|
| Neon 연결 | **연결됨.** `DATABASE_URL`·`DATABASE_URL_UNPOOLED`·`NEON_PROJECT_ID`·`POSTGRES_*`·`PG*` 가 모두 Neon 통합 저장소(`store_hxwUnPb00exPtDxv`)에서 주입됨 |
| `DATABASE_URL_TEST` | **없음.** 사용자가 지운 상태 그대로 |
| Blob | **연결됨.** `BLOB_READ_WRITE_TOKEN`·`BLOB_STORE_ID`·`BLOB_WEBHOOK_PUBLIC_KEY` |
| 그 밖 | `AUTH_SECRET`·`APP_BASE_URL`·`MAIL_ADAPTER`·`MAIL_FROM`·`NOTIFY_ADAPTER`·`STORAGE_ADAPTER`·`PRIVACY_PURGE_SECRET` |
| 없는 것 | **`CRON_SECRET`** — 자동 파기 예약에 필요 (아래 4장) |

**그다음부터 막혔습니다.** `vercel` CLI 가 설치·로그인되어 있지 않아
(`~/Library/Application Support/com.vercel.cli` 없음, `which vercel` 없음)
`vercel env pull`·`prisma migrate deploy`·시드·관리자 생성·공지 가져오기·스테이징 E2E 를
**한 건도 실행하지 못했습니다.**

> 비밀값을 보지 않기 위해 MCP 로 환경 변수를 복호화하는 길은 **쓰지 않았습니다.**
> 복호화하면 그 값이 작업 기록에 남습니다 (`CLAUDE.md` 4장, 지시 「값은 보지 않음」).

### 1-3. 전환에 필요한 코드 3건 (새로 만든 것)

Gate 가 요구하는 것 중 **로그인 없이도 만들 수 있는 것**을 먼저 구현했습니다.

| # | 무엇 | 파일 |
|---|---|---|
| 1 | **Vercel Blob 저장 어댑터** | `src/server/adapters/storage/index.ts` |
| 2 | **자동 파기 예약 경로** | `app/api/cron/privacy-purge/route.ts`, `vercel.json` `crons` |
| 3 | **배포 시 마이그레이션 자동 실행** | `vercel.json` `buildCommand`, `scripts/migrate-deploy.mjs` |

**1. Blob 어댑터** — 이전까지 `getStorageAdapter()` 는 **로컬 파일 구현 하나만** 돌려주고 있었습니다.
그대로 운영에 올리면 Vercel 함수의 파일 시스템이 요청마다 사라지므로 **올린 사진이 전부 유실**됩니다.

- `STORAGE_ADAPTER` 로 `local` / `vercel-blob` 을 고릅니다. **모르는 이름이면 멈춥니다**
  — 오타로 운영이 조용히 로컬로 떨어지는 것이 가장 흔한 사고 경로입니다.
- 공개 사진만 `access:"public"`, **이력서(AD-011)와 검사 전 원본은 `access:"private"`** 로 올려
  공개 주소가 아예 생기지 않습니다. `urlFor()` 는 그 두 영역에서 항상 `null` 입니다.
- 업로드는 `issueSignedToken` + `presignUrl(operation:"put")` 로 만든 **서명된 PUT 주소**를 브라우저에
  줍니다. 바이트가 서버 함수를 지나가지 않아 Vercel 의 요청 본문 4.5MB 상한과 무관해집니다 (ADR-008).
- 용량 상한을 `maximumSizeInBytes` 로 **저장소가** 지킵니다. 브라우저가 우회할 수 없습니다.
- 티켓을 내주기 전에 `requireAdminFromCookies()` 로 관리자 권한을 확인합니다
  (`src/lib/actions/media.ts:79`). 로컬 경로와 같은 수준입니다.
- `next/image` 의 `remotePatterns` 와 `proxy.ts` 의 `img-src` 는 Phase 6에서 이미 Blob 호스트를
  허용해 두었습니다. 확인만 했습니다.

**2. 자동 파기 예약** — Vercel 예약 실행은 GET 만 보내고 본문을 싣지 못해, 관리자 화면이 쓰는
`POST /api/admin/privacy/purge` 를 그대로 쓸 수 없습니다. 그래서 GET 경로를 따로 두고
`CRON_SECRET` 의 `Authorization: Bearer` 로만 통과시킵니다. **비밀값이 없으면 아무도 통과하지
못합니다**(404). 하루 한 번 18:00 UTC(= 03:00 KST) 입니다.

**3. 배포 시 마이그레이션** — 배포와 DB 구조가 어긋나는 것을 사람 기억에 맡기지 않습니다.
연결은 `DATABASE_URL_UNPOOLED`(직접 접속)를 먼저 쓰고 없으면 `DATABASE_URL` 로 내려갑니다.
연결 풀로 마이그레이션하면 Prisma 의 세션 권고 잠금이 다른 연결에 걸려 배포가 멈춥니다.

### 1-4. 그 밖의 코드·설정

- `scripts/bootstrap-admin.ts` — 첫 관리자 **1명**을 만듭니다. 비밀번호를 주지 않으면 임시
  비밀번호를 만들어 **터미널에 한 번만** 찍습니다. 같은 아이디가 있으면 덮어쓰지 않고 멈춥니다.
  (`npm run bootstrap:admin`)
- Preview 배포를 **다시 켰습니다** (`vercel.json` `git.deploymentEnabled`).
- `.env.example` 에 `DATABASE_URL_UNPOOLED`·`BLOB_*`·`CRON_SECRET`·`BOOTSTRAP_ADMIN_*` 를
  **키 이름만** 더했습니다.
- `tests/unit/storage-adapter-selection.test.ts` 신설 (5건).

### 1-5. 문서

| 문서 | 내용 |
|---|---|
| `docs/migration-checklist.md` | 사전 준비(공지·폼 중단·DNS TTL·메일 SPF/DKIM·일정·운영 DB 분리·관리자 계정·이미지 재업로드) · 전환 순서(단계마다 담당자·확인) · 전환 직후 확인(테스트 신청·관리자·308/410 표본·이미지·분석·sitemap 제출) |
| `docs/rollback-plan.md` | 되돌리기 2종(배포만 / 옛 사이트로) · 조건 · 절차 · 소요 시간 · **전환 중 새 사이트로 들어온 신청 처리** · 당일 출력용 요약 카드 |
| `docs/legacy-records-handling.md` | 이관 불가 기록 처리. 전환 직전 진행 중 신청을 직원이 보관하는 방법·보관 기한 · 옛 관리자 유지 기간 선택지(결정은 사람) |
| `docs/monitoring-plan.md` | 오류 추적·가동 감시·신청 건수 이상 감지. **선택지와 비용만**, 연결은 사람 승인 후 |
| `docs/reports/final-status.md` | 기능 ID별 결과 · 알려진 한계 7건 · 남은 ASM · **원장님 질문 17건 중요도 순** |
| `docs/ADMIN_GUIDE.md` | 사진 외 **전 메뉴(10~21장)** 추가 — 신청 목록·설명회·강좌·입학진단·문자신청·강사지원·공지·강사·회원·개인정보·설정·곤란할 때 |

신규 ASM **098~102**, 신규 질문 **`Q-ADM-21`**(보관 CSV 파기 기한).

---

## 2. 결과 수치

리뷰 차단 수정까지 반영한 **마지막** 수치입니다.

| 검증 | 결과 |
|---|---|
| `npm run verify:all` | **통과** (exit 0) |
| 단위·통합 | **431건 통과** / 29파일 (리뷰 전 424 / 28) |
| E2E | **52건 통과** |
| 시각 회귀 (1440·390) | **104건 통과** |
| `npx next build` (운영 빌드) | **통과.** 예약 경로가 `ƒ (Dynamic)` 로 잡히는 것 확인 (5-4 참고) |
| `tsc --noEmit` · `eslint` | 오류 0 |
| 신규 테스트 | 11건 — 저장소 어댑터 선택·경로 경계 5+2, 예약 실행 인증 6 |

> 이 수치는 **로컬**에서 로컬 PostgreSQL·로컬 파일 저장소로 돌린 것입니다.
> **스테이징·Blob 저장소에서는 아직 한 번도 돌리지 않았습니다.**

---

## 3. Gate 판정 — **FAIL (1/5 통과 + 1건 부분)**

기준: `docs/MIGRATION_PLAN.md` 6장 Phase 7.

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| 1 | 스테이징 전체 E2E 통과 | **FAIL** | 스테이징을 세우지 못했습니다 (1-2). 로컬 E2E 52건·시각 104건은 통과 |
| 2 | AD-015 이미지 저장소를 Vercel Blob 으로 전환 | **부분** | 아래 3-1 |
| 3 | 이관 불가 기록 처리 방안 확정 | **PASS** | `docs/legacy-records-handling.md`. 보관 기한은 기본안(ASM-101)이고 원장님 확인 대기(`Q-ADM-21`) |
| 4 | 롤백 절차를 스테이징에서 **한 번 실제로 실행** | **FAIL** | 스테이징이 없어 실행하지 못했습니다. 절차는 문서로 확정 |
| 5 | 모니터링·알림 동작 확인 | **FAIL** | 연결하지 않았습니다. 외부 서비스 연결은 사람 승인 사항이라(`CLAUDE.md` 3장 8번) **의도적으로** 선택지·비용만 적었습니다 (ASM-102) |

### 3-1. 기준 2의 세부 판정

| 세부 기준 | 판정 |
|---|---|
| Blob 스토어 생성 + `BLOB_READ_WRITE_TOKEN` 환경 변수 | **PASS** (이름으로 확인) |
| `@vercel/blob` 어댑터를 `StorageAdapter` 로 구현 | **PASS** |
| 바이트가 서버 함수를 지나가지 않음 (4.5MB 상한 회피) | **PASS** — 단, **방법 대체** (아래) |
| 티켓 발급 전 관리자 권한 확인 | **PASS** (`src/lib/actions/media.ts:79`) |
| 공개는 Blob `public`, 이력서는 Blob `private` + 인증 경로 유지 | **PASS** |
| `next/image` `remotePatterns` 가 Blob 호스트 허용 | **PASS** (Phase 6에서 이미 열어 둠) |
| 로컬에서 올린 사진의 운영 이전 방안 | **PASS(문서)** — 권장안 「운영에서 다시 올린다」를 `migration-checklist.md` 1-8 에 절차로 적었습니다. 실행은 전환 때 |
| 전환 후 사진 한 장 올려 공개 화면에 뜨는지 확인 | **FAIL** — 스테이징이 없어 **한 번도 확인하지 못했습니다** |

**방법 대체 1건 (사람 판단 필요)** — Gate 는 업로드를 `upload()` + `handleUpload()`
(**클라이언트 업로드 + 서버 발급 토큰**)로 하라고 적고 있습니다. 구현은
`issueSignedToken` + `presignUrl(operation:"put")` 의 **서명된 PUT 주소**를 썼습니다.

- 같은 것: 바이트가 함수를 지나가지 않음 / 티켓 발급 전 서버가 관리자 권한을 확인함 /
  공개·비공개가 저장소 수준으로 갈림
- 더 나은 점: 용량 상한을 저장소가 지킴(`maximumSizeInBytes`) · 브라우저에 **베어러 토큰이
  가지 않음** · 기존 `DirectUploadTicket` 계약과 클라이언트 코드(`media-upload.ts`)를
  **고치지 않아도** 됨
- 주의: `@vercel/blob` 2.9.0 의 `presignUrl(operation:"put")` 경로는 **실제 저장소를 상대로
  아직 한 번도 돌려 보지 않았습니다.** 타입 선언으로 호출 모양만 확인했습니다.
  스테이징 E2E 의 「이미지 업로드(Blob 저장 확인)」가 이걸 검증하는 자리입니다.

### 3-2. 판정 요약

**Gate 실패의 원인은 코드 결함이 아니라 사람이 해야 하는 1회 작업(Vercel CLI 로그인)입니다.**
그 작업이 끝나면 기준 1·4·5 와 3-1의 마지막 항목을 **이어서 실행할 수 있습니다.**
Phase 7 을 `GATE_CHECK` 로 올리지 않고 `GATE_FAIL` 로 두는 것이 사실에 맞습니다.

---

## 4. 사람이 할 일

> 위에서 아래가 순서입니다. 1번이 나머지를 막고 있습니다.

| # | 할 일 | 누가 |
|---|---|---|
| **1** | 터미널에 `npx vercel login` → `npx vercel link` (각 1회). 그러면 2~5를 이어서 진행합니다 | 사용자 |
| **2** | Vercel 환경 변수에 **`CRON_SECRET` 추가** (자동 파기 예약이 없으면 동작하지 않습니다). 값은 무작위 32자 이상 | 사용자 |
| **3** | `STORAGE_ADAPTER` 값을 **`vercel-blob`** 으로 바꾸기 (지금 값은 확인하지 않았습니다. `local` 이면 운영에서 사진이 사라집니다) | 사용자 |
| **4** | 운영 DB 를 스테이징과 **따로 둘지 결정** (`migration-checklist.md` 1-7, 추천: 따로) | 원장님·사용자 |
| **5** | 전환을 막는 결정 3건 답: **D7 DNS 관리 권한** · **D8 전환 일정** · **D4 메일 업체** | 원장님 |
| 6 | `Q-ADM-15`~`21` 답 (`final-status.md` 5장, 중요도 순) | 원장님 |
| 7 | 감시 결정 M1·M2 (`monitoring-plan.md` 5장) — 전환 전날까지 | 원장님 |
| 7-1 | 관리자 화면 「개인정보 관리」의 **「자동 파기 사용」을 켤지 결정.** 꺼 두면 예약 실행이 돌아도 지우지 않습니다(기본값 꺼짐). 켜기 전에 「미리 보기」로 건수를 먼저 확인하세요 | 원장님 |
| 8 | Gate 기준 5번(모니터링)을 **「계획 수립으로 대체」**로 인정할지 판단 | 사용자 |
| 9 | Gate 3-1의 **방법 대체 1건**(서명된 PUT 주소)을 인정할지 판단 | 사용자 |

---

## 5. 독립 리뷰 — 차단 3 / 권장 6 / 참고 3

`reviewer` 서브에이전트로 diff 기준 리뷰를 수행했습니다. **차단 3건 전부 수정**했고,
권장 6건 중 5건을 수정했습니다.

### 5-1. 차단 (3건, 전부 수정)

**차단 1 — 예약 파기가 「자동 파기 사용」 스위치를 무시했습니다.** (가장 심각)

- `runPurge()` 는 `purgeEligibleAt <= 지금` 인 기록을 지웁니다. 그 시각은 관리자가
  「파기 예약」으로 설정하며 **자동 파기 스위치와 무관**합니다. 그래서 스위치가 꺼져 있어도
  새벽 3시마다 **실제로 지워졌습니다.** 파기는 되돌릴 수 없습니다.
- `isAutomaticPurgeEnabled()` 는 Phase 4에서 만들어 두고 **어디서도 부르지 않고** 있었습니다.
- 더 나쁜 것은, 제가 쓴 문서(`ADMIN_GUIDE.md` 19-2)와 코드 주석이 「켜기 전까지 아무것도
  지워지지 않습니다」라고 **사실과 다르게** 적고 있었습니다.
- 수정: 예약 경로에서 `isAutomaticPurgeEnabled()` 를 먼저 확인하고, 꺼져 있으면
  `{ skipped: true, reason: "automatic-purge-disabled" }` 를 200 으로 답하고 **지우지 않습니다.**
- 함께 수정: 관리자 화면의 안내 문구가 「주기 실행은 붙어 있지 않습니다. 켜 두어도 자동으로
  지워지지 않습니다」였습니다. 이제 사실이 아니므로 「켜면 매일 새벽 3시에 … 꺼 두면 지우지
  않습니다. 지운 것은 되돌릴 수 없습니다」로 바꿨습니다 (`privacy-panels.tsx`).
- 고정: `tests/unit/cron-auth.test.ts` 6건으로 인증 경계를 고정했습니다.

**차단 2 — 모든 브랜치 배포가 같은 데이터베이스를 마이그레이션했습니다.**

- Preview 배포를 다시 켜면서(`"*": true`) 빌드마다 `prisma migrate deploy` 가 돌게 했는데,
  가드가 없어 **아직 병합하지 않은 브랜치를 푸시하는 것만으로** 운영 스키마가 바뀝니다.
  그리고 그것은 배포 되돌리기로 **되돌아가지 않습니다**(`rollback-plan.md` 3-1에 적어 둔 그대로).
- 수정: `scripts/migrate-deploy.mjs` 에 `VERCEL_ENV !== "production"` 이면 **건너뛰고 종료**하는
  가드를 넣었습니다. 로컬·CI 에는 `VERCEL_ENV` 가 없어 영향이 없습니다.
- 함께 수정: 로컬에서 `npm run db:deploy:direct` 가 되도록 `dotenv/config` 를 읽습니다.
- 확인(로컬): `VERCEL_ENV=preview` → 건너뜀(exit 0) · 주소 없음 → 중단(exit 1) · 로컬 → 적용(exit 0).
- 확인(`OBSERVED`, 실제 Vercel 빌드 기록 — PR #8 의 Preview 배포 `dpl_Gc1ej3Ba...`):

  ```
  Running "node scripts/migrate-deploy.mjs && next build"
  [migrate-deploy] VERCEL_ENV=preview 이라 마이그레이션을 건너뜁니다. Production 배포에서만 적용합니다.
  ```

  Preview 배포가 데이터베이스를 건드리지 않고 빌드를 마쳤습니다(`state: READY`).
  **새 빌드 명령이 Vercel 에서 실제로 동작하는 것까지 확인된 유일한 항목입니다.**

**차단 3 — 계약·기능 문서에 새 엔드포인트가 없었습니다.**

- 수정: `docs/contracts/openapi.yaml` 에 `GET /api/cron/privacy-purge` 를 추가(인증 헤더,
  200 두 가지 응답, 404 와 그 이유)하고, `docs/contracts/migration-matrix.md` 의 AD-013 행에
  예약 실행·`CRON_SECRET`·`source=SCHEDULED` 를 적었습니다.

### 5-2. 권장 (6건 중 5건 수정)

| # | 지적 | 처리 |
|---|---|---|
| 1 | Blob `pathnameFor` 가 선행 `..` 를 **조용히 제거**했다 (로컬 어댑터는 던진다) | **수정.** 거절(throw)로 바꿨습니다. 고쳐서 쓰면 `private/../public/x` 가 `public/x` 가 되어 비공개 파일이 공개 영역에 들어갈 수 있습니다. 경계 테스트 2건 추가 |
| 2 | 감사기록에서 예약 실행과 수동 실행을 구분할 수 없다 | **수정.** `runPurge` 에 `source` 를 더해 `source=SCHEDULED` / `source=MANUAL` 로 남깁니다. 기존 테스트도 함께 갱신 |
| 3 | 파기 비밀값이 둘(`PRIVACY_PURGE_SECRET`·`CRON_SECRET`)로 늘었다 | **수정(문서).** `.env.example` 에 역할 차이를 적었습니다(손으로 한 번 POST / Vercel 예약 GET). 줄이지는 않았습니다 — Vercel 이 `CRON_SECRET` 만 자동으로 붙여 줍니다 |
| 4 | `PHASE.md` 가 없는 보고서를 참조하고 리뷰 칸이 자리표시자다 | **수정.** 이 보고서를 쓰고 칸을 채웠습니다 |
| 5 | finalize 실패 시 검사 전 원본이 영구히 남는다 | **수정.** 서명 티켓에 `ttlDays: 1` 을 넣어 **저장소가 하루 뒤 스스로 지우게** 했습니다(임시 영역만) |
| 6 | `BLOB_PUBLIC_BASE_URL` 안내(「보통 비워 둔다」)와 동작(비면 throw)이 어긋난다 | **수정(문서).** 비워 둬도 올리기·보기가 되는 이유와, 비었을 때 틀린 주소를 만들지 않고 멈추는 이유를 적었습니다. 함께 `urlFor` 가 **키 검사를 먼저** 하도록 순서를 바꿨습니다 |

### 5-3. 참고 (3건)

- `bootstrap-admin.ts` 의 임시 비밀번호에 나머지 연산 치우침이 있었습니다 → **수정**(남는
  범위의 바이트를 버리고 다시 뽑습니다). 24자라 실질 위험은 작았지만 비용도 작습니다.
- 오류 메시지에 `STORAGE_ADAPTER` 값이 들어갑니다 — 비밀값이 아니라 그대로 둡니다.
- presign 에 `allowedContentTypes` 를 지정하지 않았습니다 — 바이트를 보고 형식을 다시
  판별하므로(ASM-085) 그대로 둡니다.
- 리뷰에서 **비밀값·개인정보가 로그·문서로 새는 곳은 발견되지 않았습니다.**

### 5-4. 리뷰와 별도로 찾은 결함 1건

운영 빌드(`next build`)를 돌려 보니 예약 경로가 **정적으로 미리 만들어지고 있었습니다**
(`○ Static`). 그러면 Vercel 예약 실행이 빌드 때 계산된 응답만 받아 **파기가 아예 돌지
않습니다.** `cacheComponents` 를 켠 설정에서는 `dynamic = "force-dynamic"` 을 쓸 수 없어
(빌드가 거부합니다) `connection()` 을 기다리게 고쳤습니다. 이제 `ƒ (Dynamic)` 입니다.

> `verify:all` 은 `next build` 를 돌리지 않습니다. 이 결함은 운영 빌드에서만 드러났습니다.

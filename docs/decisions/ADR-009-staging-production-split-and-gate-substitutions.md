# ADR-009 — 운영 DB 분리, Blob 저장소 분리, Phase 7 Gate 2·5 대체 인정

- 상태: 확정
- 날짜: 2026-11-15 (결정 1·2) · 2026-11-16 (결정 3)
- 결정한 사람: 사용자
- 관련 근거: `docs/migration-checklist.md` 1-7·1-9·1-10, `docs/monitoring-plan.md`, `docs/reports/phase-7-report.md` 3장, EV-0016·EV-0017·**EV-0019**
- 관련 ADR: ADR-003 (배포·DB), ADR-008 (관리자 이미지 업로드), ADR-004 (메일 정책)
- 관련 ASM: ASM-008, ASM-098, ASM-099, ASM-102

## 배경

Phase 7 Gate 는 5개 기준 중 1개만 통과했다(`GATE_FAIL`). 막힌 원인은 코드 결함이 아니라
**스테이징이 없었다는 것**이었고, 그 앞에는 로컬 Vercel CLI 로그인이라는 1회 작업이 있었다.

사용자가 2026-11-15 에 세 가지를 처리하고 두 가지를 결정했다.

- 처리: `vercel login`·`vercel link` 완료 · `CRON_SECRET` 추가(Production) ·
  `STORAGE_ADAPTER` 를 production·preview 와 development 로 나눔
- 결정: 아래 1·2

## 결정 1 — 운영 데이터베이스를 스테이징과 **따로** 둔다 (D10)

`migration-checklist.md` 1-7 의 **A 안**을 고른다.

- 전환 때 **운영용 Neon 프로젝트를 새로 만든다.** 지금 Vercel 프로젝트에 붙어 있는 Neon
  데이터베이스는 **스테이징 전용**으로 남긴다.
- Vercel 의 **Production 환경 변수만** 새 운영 DB 주소로 바꾸고, Preview·Development 는
  스테이징 DB 를 계속 쓴다.
- 운영 DB 에는 `prisma migrate deploy` 와 **기본 데이터만** 넣는다. `npm run db:seed` 의
  가짜 신청·가짜 회원은 **넣지 않는다**(`migration-checklist.md` 1-9 의 2번 주의).
- 운영 관리자 계정은 스테이징과 **다른 계정·다른 비밀번호**로 따로 만든다(1-5).

### 이유

연습과 실제가 같은 데이터베이스를 쓰면, 연습 중에 지운 기록이 실제 신청 기록이 된다.
파기·삭제는 되돌릴 수 없다(`rollback-plan.md` 3-1: 데이터베이스는 배포 되돌리기로
되돌아가지 않는다). 가짜 시드가 운영에 남는 것도 같은 문제의 다른 얼굴이다.

### 결과로 생기는 일

- 환경 변수를 두 벌 관리한다. 전환 체크리스트 T-5분 단계(운영 환경 변수 최종 확인)가
  **형식적인 확인이 아니라 실제로 값이 다른 확인**이 된다.
- 지금 `scripts/migrate-deploy.mjs` 의 `VERCEL_ENV=production` 가드는 **그대로 둔다.**
  분리 후에도 Preview 배포가 스테이징 스키마를 바꾸는 것은 막아 두는 쪽이 낫다
  (미병합 브랜치 푸시만으로 스테이징 데이터가 흐트러지면 연습 자체를 믿을 수 없다).
- 운영 DB 는 **전환 당일에 처음 만들어진다.** 그래서 「운영에서 마이그레이션이 실제로
  도는 것」은 전환 전에 확인할 수 없다. 스테이징에서 같은 명령·같은 빌드로 확인한 것이
  근거의 전부다. 이 한계를 전환 체크리스트 T-0 단계에 적는다.

## 결정 2 — Gate 2·5 의 **대체를 인정한다**

### 2-1. Gate 2 — 업로드 방식 (`upload()` + `handleUpload()` → 서명된 PUT 주소)

Gate 기준은 업로드를 `@vercel/blob/client` 의 `upload()` + 서버의 `handleUpload()`
(클라이언트 업로드 + 서버 발급 토큰)로 하라고 적고 있다. 구현은
`issueSignedToken` + `presignUrl({ operation: "put" })` 의 **서명된 PUT 주소**를 쓴다.

**대체를 인정한다.** Gate 가 요구한 것의 목적은 셋이고 구현은 셋 다 만족한다.

| Gate 가 요구한 목적 | 구현에서 어떻게 지키는가 |
|---|---|
| 바이트가 서버 함수를 지나가지 않는다 (요청 본문 4.5MB 상한 회피) | 브라우저가 저장소 주소로 직접 PUT 한다 |
| 티켓을 내주기 전에 서버가 관리자 권한을 확인한다 | `requireAdminFromCookies()` (`src/lib/actions/media.ts:79`) |
| 공개·비공개가 저장소 수준으로 갈린다 | 공개만 `access:"public"`, 이력서·검사 전 원본은 `access:"private"` |

추가로 나은 점: 용량 상한을 저장소가 지킨다(`maximumSizeInBytes`) · 브라우저에 베어러
토큰이 가지 않는다 · 기존 `DirectUploadTicket` 계약과 클라이언트 코드를 고치지 않아도 된다.

**남는 조건 — 2026-11-16 해소.** `presignUrl(operation:"put")` 경로를 실제 Vercel Blob
저장소를 상대로 돌려 확인했다. 스테이징에서 사진 한 장을 올려 보관함에 들어가고
공개 주소(`…public.blob.vercel-storage.com`)가 열쇠 없이 200 으로 열리는 것까지 봤다
(`OBSERVED`, EV-0019 3-3). 확인하는 과정에서 결함 셋이 드러나 고쳤다 — CSP `connect-src`,
저장소 공개/비공개(아래 결정 3), 점검의 보호 우회 방식.

### 2-2. Gate 5 — 모니터링·알림 「동작 확인」을 「계획 수립」으로 대체

Gate 기준은 모니터링·알림이 실제로 동작하는 것을 확인하라고 적고 있다. Phase 7 은
외부 서비스를 **연결하지 않고** 선택지와 비용만 적었다(`docs/monitoring-plan.md`, ASM-102).

**대체를 인정한다.** 근거는 둘이다.

1. 외부 서비스 연결은 `CLAUDE.md` 3장 8번이 **사람 승인 사항**으로 묶어 둔 것이다.
   Claude 가 승인 없이 연결하는 것이 규약 위반이므로, 연결하지 않은 것은 누락이 아니라
   규약을 지킨 결과다.
2. 지금 감시해야 할 대상(운영 트래픽·실제 신청)이 **아직 없다.** 전환 전에 붙이면
   아무 신호도 없는 알림을 「동작 확인」했다고 적게 된다.

**남는 조건**: 전환 전날까지 원장님이 `monitoring-plan.md` 5장의 M1·M2 를 결정하고,
전환 후 1주 안에 실제 연결·동작 확인을 한다(`migration-checklist.md` 4장).
이 ADR 은 Phase 7 Gate 통과를 위한 대체이고, **전환 후의 확인 의무를 면제하지 않는다.**

> 가동 감시를 붙일 때 Vercel 로그인 보호(Deployment Protection)가 켜져 있으면
> 감시 도구가 로그인 화면을 받아 「정상」으로 적거나 전부 실패로 적는다.
> `monitoring-plan.md` 에 적어 둔 주의가 그대로 적용된다.

## 결정 3 — Blob 저장소를 **공개용·비공개용 둘로** 나눈다

- 날짜: 2026-11-16 · 결정한 사람: 사용자

### 배경 (관찰)

스테이징에서 사진을 올려 보니 저장소가 거부했다 (`OBSERVED`, EV-0019 2-6):

```
Vercel Blob: Cannot use public access on a private store.
The store is configured with private access.
```

Blob 저장소의 공개/비공개는 **만들 때 고정**되고(`vercel blob create-store --access`),
한 저장소가 둘을 함께 담지 못한다. ADR-008 과 Phase 7 어댑터는 한 저장소가 공개 사진과
이력서를 함께 담는다고 가정하고 있었다. **그 가정이 틀렸다.**

### 결정

| 영역 | 저장소 | 환경 변수 |
|---|---|---|
| 공개 사진 (공지 본문·강사·배너·시설) | **public** 저장소 `munsayu-v2-public` | `BLOB_PUBLIC_READ_WRITE_TOKEN` · `BLOB_PUBLIC_STORE_ID` |
| 이력서(AD-011) · 검사 전 원본(staging) | **private** 저장소 (기존) | `BLOB_PRIVATE_*`, 없으면 Vercel 통합 기본 이름 `BLOB_READ_WRITE_TOKEN`·`BLOB_STORE_ID` |

- **이름을 영역별로 나눈다.** 공개 쪽 코드는 `BLOB_PUBLIC_*` 만 읽고, 비공개 저장소의
  이름으로 흘러가는 길을 만들지 않는다. 그 길이 있으면 이력서가 공개 저장소로 올라가
  누구나 주소로 받을 수 있게 된다 — 되돌릴 수 없는 사고다.
- 설정이 없으면 **다른 저장소로 떨어지지 않고 멈춘다.**
- `token` 과 `storeId` 를 **둘 다** 넘긴다. SDK 는 OIDC(`VERCEL_OIDC_TOKEN`)가 있으면
  `BLOB_STORE_ID` 를 함께 보고 저장소를 정하는 길도 갖고 있어, 토큰만 넘기면 환경에
  따라 다른 저장소로 갈 수 있다.
- 고정: `tests/unit/storage-blob-store-split.test.ts` 8건 — 「이력서·검사 전 원본이 공개
  저장소로 가지 않는다」와 「설정이 없으면 멈춘다」를 양방향으로 본다.

### 결과로 생기는 일

- 저장소가 하나 늘어난다(비용은 사용량 기준). 전환 체크리스트 1-10 에 두 저장소의
  환경 변수를 함께 적었다.
- 운영 전환 때 **public 저장소도 운영 프로젝트에 연결**해야 한다. 지금은 스테이징
  프로젝트(=전환 전의 운영 프로젝트)에만 붙어 있다.
- ADR-008 의 「한 저장소에 공개·비공개를 영역으로 나눈다」 서술은 이 ADR 이 바꾼다.

## 인정하지 않는 것

- **Gate 1(스테이징 전체 E2E)과 Gate 4(롤백 절차 실행)는 대체하지 않았다.** 둘은 실제
  실행으로만 채울 수 있고, 2026-11-16 에 **실제로 실행해서** 채웠다 (EV-0019 3-1·3-4).
  로컬 운영 빌드에서 32건을 통과한 것(EV-0016)만으로는 Gate 1 을 채우지 않는다는 판단은
  그대로 유지한다.
- **운영 전환 사용자 승인**(Gate 마지막 항목)은 그대로 남는다. 실제 DNS·프록시 변경은
  사람이 함께 한다.

# Phase 5 보고서 — Legacy Parity Testing (진행 중 · 추가 기능 구현분)

> 이 보고서는 **아직 Gate 판정 전**이다. 사용자가 2026-11-12에 지시한 추가 관리자 기능과
> Phase 3·4 이월 항목의 처리 결과를 먼저 정리한다. 레거시 동등성 검증(Phase 5 본 작업)은
> 아래 「남은 일」에 적었다.

---

## 완료한 작업

### 0단계 — 증거 보강 (GET 관찰만)

| 증거                      | 내용                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `EV-ADM-08` ~ `EV-ADM-11` | 사용자가 제공한 가림 화면 4장. 개인정보가 가려진 것을 직접 확인한 뒤 ledger에 등록           |
| `EV-0013`                 | `/sub/abouttch3` — 사이트 안에 폼이 없고 「문해력 진단 신청」이 외부 Google Forms 로 나간다  |
| `EV-0014`                 | `/sub/Recruit` — 공개 강사 지원 폼의 필드·선택지·필수 첨부·동의 관찰 (입력·업로드·제출 없음) |

운영 사이트에 보낸 요청은 모두 GET 이다. 폼 제출·파일 업로드·관리자 경로 접근은 하지 않았다.

### AD-009 입학진단 및 상담 신청 관리 (범위 변경 — ADR-007)

- 공개 화면에는 **신청 폼을 두지 않는다.** 「문해력 진단 신청」 버튼은 관리자가 등록한
  구글 폼 주소를 연다. 주소는 관리자 「사이트 설정」에서 바꾼다. // ASM-082
- 관리자 `/admin/consultations` 를 EV-ADM-08 구성대로 만들었다: 상태별 건수(총 신청·대기·
  상담완료·신청취소), 학부모 성함·연락처 검색, 처리 상태 일괄 변경(선택수정), 선택삭제,
  CSV(AD-013 기록), 원문 보기(AD-013 기록).
- 상담 유형은 관리자가 추가·수정한다. 이미 쓰인 유형은 지우지 않고 숨긴다. // ASM-083

> **경과:** 처음에는 사이트 내 신청 폼까지 만들었으나, 같은 날 사용자가 "폼은 지우고
> 구글 폼 링크만 넣으면 되게" 수정해 폼·Server Action·공개 라우트를 제거했다.
> 신청 내역 표는 사용자 선택에 따라 유지한다. 사이트 내 폼이 없으므로 외부 연동이
> 붙기 전까지 목록은 비어 있다. (`POST /api/consultation-applications` 가 입력 경로로 남아 있다)

### AD-010 설명회 알림 신청 (이월 항목)

- 홈 하단 폼을 되살렸다. 항목은 레거시와 같고(학년·학생 이름·학교명·보호자 연락처),
  레거시에 없던 개인정보 동의와 알림 수신 동의를 **따로** 받는다. // ASM-086
- 관리자 `/admin/sms-subscriptions` — 목록(마스킹), 검색, 선택삭제, CSV, 원문 보기.
- **문자 발송은 없다.** 신청 내역만 남기고 직원이 직접 연락한다. (D4)

### AD-011 강사 지원 (범위 포함 — ADR-007, ASM-007 수정)

- `/sub/Recruit` 공개 폼. 항목·선택지·버튼 문구는 EV-0014 관찰값 그대로다.
- 레거시처럼 주 메뉴에 기본으로 보이지 않는다. 관리자 설정으로 켠다. // ASM-088
  검색엔진 색인도 막았다.
- 제출 서류: PDF·DOCX·HWP·HWPX 만 받고 **파일 내용(매직 바이트)** 으로 형식을 확인한다.
  기본 10MB, 관리자 설정으로 변경. 확장자·Content-Type 은 믿지 않는다. // ASM-085
- 서류는 StorageAdapter 의 **비공개 영역**에 저장한다. 공개 주소를 만들지 않고,
  관리자 인증 경로로만 내려받으며 내려받기마다 `RESUME_DOWNLOAD` 기록을 남긴다.
- 관리자 `/admin/instructor-applications` — 지원자 수, 실명 검색, 상태 일괄 변경,
  선택삭제(파일 동시 삭제), CSV, 원문 보기, 서류 내려받기.
- 보존 기간 파기 시 저장된 파일도 함께 지운다.

### AD-014 공지사항 관리 (신규 기능 ID — ADR-007)

- 그누보드 게시판 엔진은 옮기지 않았다. 레거시 게시판이 `notice` 하나뿐이라
  공지사항 단일 게시판으로 만들었다. // ASM-089
- 관리자 `/admin/notices` — 목록·검색, 작성·수정·선택삭제, 상단 고정, 임시 저장/게시,
  게시 일시, 첨부파일, 본문 이미지 업로드.
- 본문 HTML 은 **저장 전과 조회 시** 모두 허용 목록으로 정리한다. 편집기·정리기 선택은 ADR-006.
  SVG 는 본문 이미지로 받지 않는다.
- 공개 목록·상세가 DB 글을 보여 준다. 한 쪽 15건으로 레거시와 같다. (EV-0007)
- 레거시 글 번호(`wr_id`)를 저장해 `/bbs/board.php?bo_table=notice&wr_id=N` → `/notice/N`
  308 연결이 가져온 글로 이어진다.
- 가져오기 스크립트 `scripts/import-legacy-notices.mjs` — GET 만, 요청 간격 1.2초,
  여러 번 실행해도 중복이 없고, 개인정보로 보이는 글은 건너뛰고 글 번호만 보고한다. // ASM-090

### 이월 항목

| 항목                    | 결과                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 로컬 실행 안내          | **완료.** `docs/LOCAL_DEV.md` — DB 띄우기, `.env` 키 이름(값 없음), 마이그레이션·시드·개발 서버, 관리자 주소, 첫 관리자 계정 만드는 방법, 레거시 공지 가져오기 |
| AD-010 설명회 알림 신청 | **완료.** 위 참조                                                                                                                                              |
| 메인 원본 HTML 반영     | **미착수.** `docs/legacy/source/home/` 사용자 저장본이 없다. Phase 1 DOM 증거만으로 하는 작업이라 Phase 5 동등성 검증과 함께 진행해야 한다                     |

### 함께 바뀐 것

- `PrivacyRetentionSetting` 에 상담·강사 지원·알림 신청 보유기간 문구 칸 추가.
  신청자가 본 문구와 저장되는 정책 버전이 종류마다 따로 간다. (BZ-002)
- 파기(`runPurge`)가 새 세 종류를 함께 처리하고, 강사 지원은 파일까지 지운다.
- CSV 내보내기를 한 곳(`src/server/lib/csv.ts`)으로 모으고, 표 계산 프로그램이 수식으로
  읽을 수 있는 값(`=`·`+`·`-`·`@`)을 글자로 고정했다.
- 관리자 메뉴 순서를 레거시에 맞췄다: 회원관리 → 설명회관리 → 강사관리 → 시간표관리 →
  입학진단관리 → 문자신청내역 → 강사지원관리 → 공지사항.
- `cacheComponents` 환경에서 관리자 설정·보존 문구를 읽는 조각에 `connection()` 을 넣었다.
  넣기 전에는 관리자가 주소를 바꿔도 홈 푸터가 옛 주소를 계속 보여 줬다. (E2E 로 잡은 결함)

---

## 변경한 파일

### 계약 · 스키마

- `prisma/schema.prisma`, `prisma/migrations/20261112120000_phase5_consultation_instructor_notice_sms/`
- `prisma/seed.ts`
- `src/lib/contracts/applications.ts`, `src/lib/contracts/admin.ts`

### 서버

- `src/server/services/consultations.ts` (신규)
- `src/server/services/instructor-applications.ts` (신규)
- `src/server/services/sms-subscriptions.ts` (신규)
- `src/server/services/notices-admin.ts` (신규)
- `src/server/services/settings.ts` (신규)
- `src/server/services/notices.ts`, `src/server/services/privacy.ts`, `src/server/services/applications-admin.ts`
- `src/server/lib/csv.ts`, `src/server/lib/file-format.ts`, `src/server/lib/sanitize-notice-html.ts` (신규)
- `src/server/adapters/storage/index.ts` (공개/비공개 영역 구현)

### Route Handler

- `app/api/consultation-applications/`, `app/api/sms-subscriptions/`, `app/api/instructor-applications/`
- `app/api/notices/attachments/[id]/`
- `app/api/admin/consultations/`(+`export`), `app/api/admin/instructor-applications/`(+`export`, `document`)
- `app/api/admin/sms-subscriptions/`(+`export`), `app/api/admin/notices/`, `app/api/admin/settings/`

### 화면

- `app/admin/(authed)/consultations/`, `sms-subscriptions/`, `instructor-applications/`, `notices/`(+`[id]`), `settings/`
- `app/(public)/sub/Recruit/`
- `src/components/admin/` — `consultations-panels`, `instructor-applications-panels`,
  `sms-subscriptions-panels`, `notices-panels`, `notice-editor`, `settings-panels`,
  `reveal-dialog`(신규 공통), `admin-nav`, `privacy-panels`
- `src/components/public/recruit-form.tsx`, `src/components/home/event-notice-form.tsx`
- `src/components/layout/footer-reserve-links.tsx`, `site-footer.tsx`
- `src/components/ui/form-controls.tsx` (TextArea·CheckboxGroup·File 추가)
- `app/(public)/page.tsx`, `app/(public)/sub/abouttch3/page.tsx`, `app/(public)/notice/`(목록·상세)
- `app/globals.css` (`.notice-body`)

### Server Action

- `src/lib/actions/admin-intake.ts` (신규), `src/lib/actions/public-forms.ts`, `src/lib/actions/internal.ts`, `src/lib/actions/admin.ts`

### 문서

- `docs/decisions/ADR-006-notice-editor-and-sanitizer.md` (신규)
- `docs/decisions/ADR-007-phase5-admin-scope-change.md` (신규)
- `docs/LOCAL_DEV.md` (신규)
- `docs/contracts/openapi.yaml`, `docs/contracts/migration-matrix.md`, `docs/contracts/route-compatibility-map.json`
- `docs/legacy/legacy-form-contracts.md`, `docs/legacy/legacy-feature-matrix.md`, `docs/legacy/legacy-admin-screens.md`
- `docs/reports/open-questions.md` (ASM-082~090), `docs/reports/migration-status.md`
- `docs/evidence/ledger.md` (EV-ADM-08~11, EV-0013, EV-0014)

### 스크립트 · 설정

- `scripts/import-legacy-notices.mjs` (신규), `package.json`(`import:notices`)
- `.env.example`(`STORAGE_ROOT`), `.gitignore`(`.storage`), `.prettierignore`(`docs/evidence`)
- 새 의존성: `sanitize-html`, `@types/sanitize-html` — 이유는 ADR-006

---

## 이관된 PHP 기능

`AD-009`(관리 화면), `AD-010`, `AD-011`, `AD-014`.
`RT-001` 공지 상세 308 연결이 가져온 글로 이어지도록 보강했다.

---

## 실행한 테스트와 결과

| 명령                     | 결과                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `npm run typecheck`      | 통과 (오류 0)                                              |
| `npm run lint`           | 통과 (오류 0)                                              |
| `npm run format`         | 통과                                                       |
| `npm test` (단위 + 통합) | **304건 통과 / 0건 실패** (Phase 4 시점 210건 → 94건 추가) |
| `npm run e2e`            | **52건 통과 / 0건 실패** (37건 → 15건 추가)                |

새로 넣은 테스트:

- 단위 `tests/unit/file-format.test.ts` — PDF·DOCX·HWP·HWPX 판별, 위장 파일 2종, SVG 거부
- 단위 `tests/unit/notice-sanitizer.test.ts` — XSS 7종, 허용 서식 보존, CSV 수식 고정
- 통합 `tests/integration/ad-009-010-intake.test.ts` — 20건
- 통합 `tests/integration/ad-011-instructor-applications.test.ts` — 16건
- 통합 `tests/integration/ad-014-notices.test.ts` — 18건
- E2E `tests/e2e/phase5-intake.spec.ts` — 7건 (기능마다 1건 이상)
- `tests/integration/admin-routes.ts` 에 새 관리자 경로 9개를 등록해 권한 테스트가 함께 돈다

기능마다 정상 / 필수값 누락 / 형식 오류 / 동의 누락 / 권한 없음(403) / 비로그인(401) 을 넣었다.
이력서는 허용되지 않은 형식·용량 초과·위장 파일, 공지는 XSS·임시 저장 글 비공개,
가져오기는 재실행 시 중복 없음을 확인했다.

### 고친 결함

| 결함                                                                                                                | 어떻게 찾았나                                            |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 관리자가 진단 신청 주소를 바꿔도 홈 푸터가 옛 주소를 계속 보여 줌 (`cacheComponents` 에서 요청 시점 렌더 표시 누락) | E2E `RT-003` 실패                                        |
| 관리자 보존 설정 화면에 Phase 5에서 늘어난 문구 칸 3개가 빠져 저장이 422 로 막힘                                    | E2E `BZ-002` 실패                                        |
| 기존 공지가 마이그레이션 뒤 모두 `DRAFT` 가 되어 공개 목록에서 사라짐                                               | 통합 `PG-012` 실패 → 마이그레이션에 데이터 보정 SQL 추가 |

---

## 2026-11-14 — 0단계 보완 (동등성 검증 전 선행 수정)

레거시 동등성 검증을 시작하기 전에 사용자가 지시한 미처리 수정 6건을 처리했다.

| # | 항목 | 상태 | 근거 |
| --- | --- | --- | --- |
| 1 | Server Action 인자 로그에 비밀번호·개인정보 금지 | **고침** | `OBSERVED` — 아래 참조 |
| 2 | `SEED_*_PASSWORD` 등 빈 문자열 환경 변수를 「값 없음」으로 | **고침** | `src/server/env.ts` 신설 |
| 3 | 로컬 전용 `db:unlock`, 잠금 중 남은 시간 안내 | **고침**(스크립트) / 이미 됨(안내) | `scripts/unlock-login.ts` · `throttle.ts` |
| 4 | 공개 화면 설정값 조회 실패 시 기본값 렌더 | 이미 됨 — 확인만 | `services/settings.ts` `getSiteSettings()` try/catch |
| 5 | `prisma generate` 가 `DATABASE_URL` 없이 통과 · main 외 자동 배포 끄기 | **고침** | `prisma.config.ts` · `vercel.json` |
| 6 | `docs/LOCAL_DEV.md` | 이미 됨 — 확인만 | 2026-11-12 작성 |

### 1. Server Action 인자 로그 (`OBSERVED`)

Next 16 개발 서버는 Server Function 호출을 **인자까지 그대로** 터미널에 찍는다. 로컬 개발
서버에 표식용 비밀번호로 관리자 로그인을 한 번 시도해 직접 확인했다.
(아래 로그에서 비밀번호 자리는 가렸다. 실제로는 **입력한 값이 그대로** 찍혔다.)

```
POST /admin/login 200 in 94ms
  └─ ƒ adminLoginAction({"loginId":"admin","password":"<입력한 값이 그대로>","rememberMe":false}) in 83ms
```

같은 방법으로 **운영 빌드(`next build` → `next start`)에서는 찍히지 않는** 것도 확인했다.
비밀번호와 신청자 개인정보(이름·학교·연락처) 카나리 4종 모두 운영 로그에 0건이었다.

`next.config.ts` 에 `logging.serverFunctions: false` 를 넣어 껐고, 같은 절차로 다시 확인해
`POST /admin/login 200 in 66ms` 만 남고 인자 줄은 사라진 것을 확인했다.

응용 코드 쪽은 이미 안전했다. `toFailure()`·`errorResponse()` 는 오류 **이름만** 남기고,
Prisma 클라이언트에 질의 로그를 켜 두지 않았으며, 직원 알림 문구에는 개인정보가 없다.

### 2. 빈 문자열 환경 변수

`process.env.X ?? 기본값` 은 `X=` 처럼 값이 비어 있으면 기본값을 건너뛰고 빈 문자열을 쓴다.
빈 비밀번호를 해시하거나 빈 경로로 파일을 쓰는 사고가 여기서 나온다. `src/server/env.ts` 의
`envValue()` 로 **공백뿐인 값은 「값 없음」** 으로 보게 바꾸고 11곳에 적용했다
(`SEED_*_PASSWORD`, `STORAGE_ROOT`, `APP_BASE_URL`, `AUTH_SECRET`, `PRIVACY_PURGE_SECRET`,
`MAIL_*`, `NOTIFY_ADAPTER`, `DATABASE_URL`). 단위 테스트 `tests/unit/env.test.ts` 5건 추가.

### 3. `db:unlock`

`npm run db:unlock [loginId]` — `LoginAttempt` 행만 지운다. 계정·비밀번호·세션은 건드리지
않는다. `NODE_ENV=production`·`VERCEL`·`CI` 중 하나라도 있으면 중단한다(직접 확인).
잠금 중 남은 시간 안내는 이미 `getLoginLockState()` 의 `retryAfterMinutes` 로 나가고 있었다
(1분 미만은 1분으로 올려 말함). `throttle.ts` 가 가리키던 없는 ADR-009 참조를 ADR-005로 고쳤다.

### 5. 빌드·배포 설정

- `prisma.config.ts` 가 `env("DATABASE_URL")` 을 쓰면 변수가 없을 때 설정을 읽는 순간
  `PrismaConfigEnvError` 로 멈춘다. `npm ci` 의 postinstall 이 바로 이 경로라 **DATABASE_URL
  없는 CI·빌드가 전부 깨진다.** 직접 재현한 뒤 변수를 직접 읽도록 바꿨고, 변수 없이
  `prisma generate` 통과 / `prisma migrate status` 는 `Connection url is empty` 로 명확히
  실패하는 것을 확인했다.
- `vercel.json` 신설. `git.deploymentEnabled` 를 `{"*": false, "main": true}` 로 두어
  main 외 브랜치의 자동 배포를 끈다. (Vercel 문서: 여러 규칙에 걸리고 하나라도 true 면 배포)
  **운영 프로젝트 설정은 건드리지 않았다.** 저장소 설정 파일만 추가했다.

### 함께 찾아 고친 결함 3건

| 결함 | 어떻게 찾았나 | 고친 곳 |
| --- | --- | --- |
| 개발자 `.env` 에 `SEED_ADMIN_PASSWORD` 가 있으면 **E2E 로그인 흐름이 전부 깨진다.** seed 는 그 값을 쓰는데 테스트는 코드 기본값만 봤다 | E2E 3건 실패 | `playwright.config.ts` 가 `.env` 를 읽고 `tests/e2e/helpers.ts` 가 seed 와 같은 규칙으로 비밀번호를 만든다. `.env` 값 있을 때·없을 때 모두 52건 통과 확인 |
| `npm run e2e` 뒤 `npm run e2e:visual` 이 항상 실패한다. E2E 가 만든 공지 18건·강사 1명이 남아 공개 화면이 길어진다 | 시각 회귀 6건 실패 | `tests/e2e/global-setup.ts` 가 공지·강사·상담·알림·강사지원 중 seed 행이 아닌 것을 지운다 |
| AD-015 로 붙인 강사 사진이 seed 를 다시 돌려도 남아 PG-005 가 로고 대체(ASM-080) 대신 사진을 보여 준다 | 시각 회귀 2건 실패 | `prisma/seed.ts` 가 `photoMediaId: null` 로 되돌린다 |

### 의도된 변경 1건 — PG-001 기준 이미지 갱신

홈 기준 이미지가 Phase 3·4(`a718ce5`) 시점이라 **AD-010 설명회 알림 신청 폼이 없다.**
AD-010 은 사용자가 2026-11-12에 범위 포함으로 결정한 항목이다(`PHASE.md` 이월 항목, ADR-007).
높이 차 1440px 기준 5549 → 6221px 이 전부 그 폼 구간이고 나머지 구간은 차이가 없다.
기준 이미지를 갱신했다. **다른 PG 화면의 기준 이미지는 건드리지 않았다.**

### 이때 확인한 테스트

| 명령 | 결과 |
| --- | --- |
| `npm run verify:all` | **통과** — assets + typecheck + lint + 단위·통합 369건 + E2E 52건 + 시각 회귀 104건 |

---

## 2026-11-14 — 1단계 레거시 동등성 검증 (중단: 분석용 Chrome 연결 끊김)

전체 결과는 `docs/reports/legacy-parity-report.md`, 관찰 근거는 `docs/evidence/parity/EV-0015-phase5-parity.md`.

### 한 일

공개 경로 16개를 레거시·신규 양쪽에서 받아 **주소·SEO·문구·폼·화면·이미지·기능 흐름**을
대조했다. 레거시에는 GET 만 보냈고 요청 사이 1초를 쉬었다. 관리자 경로는 열지 않았다.

| 구분 | 건수 |
|---|---|
| 버그 — 고침 | 9 |
| 의도된 변경 — 근거 있음 | 7 |
| 확인 필요 — 원장님 질문 `Q-ADM-15`~`Q-ADM-20` | 6 |
| 데이터 차이(시드) | 4 |

내부 링크 404 **0건**, `munsayu.com` 절대 주소 **0건**, 깨진 이미지 **0건**,
RT-001·002·004 레거시 주소 호환 **계약대로**.

### 고친 결함 9건 중 눈에 띄는 것

- 홈 배너 **슬라이드 2·3 문구가 통째로 빠져 있었다**(1번 문구를 3장에 복사). 복원.
- 홈 **「문사유만의 4대 차별화 시스템」 섹션 전체**가 없었다. 추가.
- 헤더 하위 메뉴 링크가 펼치기 전에는 HTML 에 없어서 `/sub/Facility`·`/sub/abouttch2`·
  `/sub/Check`·`/notice` **네 화면이 어디에서도 연결되지 않았다.** 항상 HTML 에 두도록 고침.
- 오류 처리 catch-all 이 **Next 내부 제어 예외까지 삼켰다.** 빌드 로그 `unhandled_request_error`
  36줄 → 0줄. 런타임에서 리다이렉트·`notFound()` 가 사라질 수 있던 문제다.
- E2E·시각 회귀가 **수화되지 않은 화면**을 상대로 돌고 있었다(개발 서버 `/_next/hmr` 교차 출처
  차단). E2E 35/52 → **52/52**. 그동안 통과·실패가 오락가락한 원인이다.

### 해소된 가정

- `ASM-040` 주 메뉴 하위 항목 — 레거시 드롭다운 마크업을 직접 읽어 관찰값으로 교체.
- `legacy-seo-map.md` 의 `UNKNOWN` — 16경로 전수 관찰로 채움.
- AD-009 신청이 관리자 목록에 들어오는 경로 — `/sub/about` 의 `POST ./about.php` 폼.

### 어긋난 가정

- `ASM-043` — 레거시 `/sub/abouttch3` 은 문해력 진단 안내가 **아니라** 비어 있는
  「컨설팅팀」 강사진 화면이고 메뉴에서도 주석으로 꺼져 있었다. (`Q-ADM-17`)
- `legacy-form-contracts.md` 의 「사이트 안에는 신청 폼이 없다」 — `/sub/about` 에 실재한다.
  폼 제거 지시(2026-11-12)가 이 전제 위에서 나왔으므로 재확인이 필요하다. (`Q-ADM-16`)

### 새로 적은 가정

- `ASM-095` 공개 화면 title·description·canonical·og 는 화면별로 다르게 쓴다.
- `ASM-096` `/sub/about` 상담 폼은 사용자 재확인 전까지 되살리지 않는다.

### 남은 비교 2건 (2026-11-14 완료)

중간에 분석용 Chrome 연결이 끊겨 미뤘던 두 건을, 저장해 둔 레거시 HTML 로 마쳤다.
레거시의 지점 탭·소개 탭은 **화면에서 접혀 있어도 본문이 HTML 안에 모두 있었다.**

| 대상 | 찾은 것 | 처리 |
|---|---|---|
| `/sub/Facility` 분당점 탭 | 공간 카드 묶음 이름 3개가 틀렸고(`READING SEAT`·`CARE`·`COMFORT`) 본문 4개가 비어 있었다. 제목·슬라이드 제목·마지막 안내 블록도 대치 문구를 쓰고 있었다 | 관찰값으로 교체 — **ASM-081 해소** |
| `/sub/Location` 분당점 탭 | 도보·지하철 안내가 통째로 비어 있었다. 레거시 버스 표는 머리글만 있고 줄이 없다 | 관찰값으로 채움 — **ASM-049 해소** |
| `/sub/about` 2·3번 탭 | 2번 탭이 PROJECT COSMO 라는 추측은 맞았다. 3번 탭에는 상담 절차 4단계와 `[문해와 사유] 학원 안내` 가 더 있었다 | 추가 — **ASM-048 부분 해소** (폼은 ASM-096 으로 보류) |

함께 고친 테스트 하네스 결함 1건: E2E 가 **이미 떠 있는 개발 서버를 재사용**하면
`MAIL_ADAPTER=file` 이 빠진 채로 돌아 비밀번호 재설정 흐름이 `ENOENT` 로 깨졌다.
원인이 드러나지 않는 실패라 매번 새로 띄우도록 바꿨다. (`playwright.config.ts`)

### 아직 넣지 않은 것

`/sub/Facility` 슬라이드 사진마다 레거시는 제목·설명을 함께 보여 준다(지점별 4장, 모두
8쌍). 신규는 사진만 보여 준다. 사진은 AD-015 로 관리자가 관리하는 자료이고 지금 자료
모양에 설명 칸이 하나뿐이라 두 칸으로 늘리는 일은 이번 범위에서 다루지 않았다.
레거시 문구 8쌍은 `EV-0015` 9절에 적어 두었다.

---

## 남은 UNKNOWN / 알려진 한계

- **레거시 동등성 검증(Phase 5 본 작업)을 아직 하지 않았다.** REA·Playwright 로 레거시와
  신규 화면을 비교하는 작업이 남아 있다.
- **메인 원본 HTML 반영**이 남아 있다. 사용자 저장본이 없어 Phase 1 DOM 증거 기준으로
  해야 하며, 상담 시간 두 가지와 `/sub/abouttch3` 링크는 원장님 확인이 필요하다.
- AD-009 신청 내역 표는 사이트 내 폼이 없어 **비어 있다.** 구글 폼 응답을 끌어오는 연동은
  범위에 없다.
- 레거시 공지 상세의 HTML 구조를 직접 열어 보지 않았다. 가져오기 스크립트는 그누보드 기본
  스킨을 전제로 하고, 맞지 않으면 글 번호만 보고하고 건너뛴다. **실제 실행은 아직 안 했다.**
- 그누보드 게시판 엔진 설정(포인트·스킨·SNS·접속기기)은 옮기지 않았다. // ASM-089
- 상담 유형·강사 지원 상태의 실제 운영 값을 보지 못했다. 기본 목록은 ASM-083·087.

---

## 사용자 결정이 필요한 항목

| 질문                                                                                   | 관련             |
| -------------------------------------------------------------------------------------- | ---------------- |
| 진단 신청을 받는 구글 폼 주소가 바뀌면 알려 주세요.                                    | ASM-082          |
| 상담 유형을 더 두어야 하나요? 초등 말고 다른 학년 상담도 받으시나요?                   | ASM-083, ASM-084 |
| 강사 지원에서 받고 싶은 서류 형식이 더 있나요?                                         | ASM-085          |
| 설명회 알림을 문자로 보내실 건가요, 직원이 직접 전화하실 건가요?                       | ASM-086, D4      |
| 지원자 상태를 어떤 단계로 나누시나요?                                                  | ASM-087          |
| 강사 모집을 홈페이지 메뉴에 내놓으실 건가요?                                           | ASM-088          |
| 공지 말고 더 쓰실 게시판이 있나요?                                                     | ASM-089          |
| 레거시 공지 가져오기를 실제로 실행해도 될까요? (먼저 `--dry-run` 결과를 보여 드립니다) | ASM-090          |
| 메인 화면 원본 HTML 저장본을 주실 수 있나요?                                           | 이월 항목        |

---

## Gate — 판정 (2026-11-14)

기준 원본은 `docs/MIGRATION_PLAN.md` 6장이다.

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| 1 | 핵심 기능(신청·예약 흐름) 테스트 100% 통과. 설명회 폼은 Phase 2 계약 기준 | **통과** | 통합 369건·E2E 52건 전부 통과. 설명회는 D9/ADR-004 의 신규 설계 계약으로 검증 |
| 2 | 모든 `PG-*` 에 REA `compare_web_captures` 비교 결과 존재, 반복 비교는 Playwright Test 로 CI 포함 | **방법 대체** | 아래 설명 |
| 3 | 시각 차이 전부 「의도된 개선 / 수정 완료」로 분류 | **통과** | 전수 분류: 수정 12건 · 의도된 변경 7건 · 원장님 확인 6건 (`legacy-parity-report.md`) |
| 4 | `INFERRED` 항목이 `OBSERVED` 로 잘못 표시된 곳 0건 | **통과** | 이번에 2건을 찾아 고쳤다(아래). 고친 뒤 0건 |
| 5 | 관리자 업무 흐름(신청 확인 → 상태 변경 → 알림) E2E 통과 | **통과** | `phase5-intake.spec.ts`·`admin-access.spec.ts`·`course-application.spec.ts` |

**판정: 4개 충족 / 1개는 방법을 바꿔 수행. 2번의 처리는 사람 확인이 필요하다.**

### 2번 기준을 글자 그대로 채우지 못한 이유

- REA `compare_web_captures` 는 **보이는 영역만** 찍는다(스크롤·전체 화면 캡처를 하지 않음).
  공개 화면 대부분이 한 화면을 넘기 때문에 이 도구만으로는 화면 비교가 성립하지 않는다.
- 분석용 Chrome(9222) 연결이 검증 도중 끊겨 REA 캡처를 다시 모을 수 없었다.

대신 한 일 — 공개 16경로 **전수**로, 레거시·신규 양쪽에서:

| 비교 항목 | 방법 | 결과 보관 |
|---|---|---|
| 화면 | Playwright 전체 화면 1440/390 × 16경로 × 양쪽 = 64장, 문서 크기 대조 | `EV-0015` 8절 |
| 문구 | `h1`~`h6` 전수 추출 후 집합 비교 | `EV-0015` 5·9절 |
| SEO | `title`·`description`·`canonical`·`og:*`·`robots` 대조 | `EV-0015` 1절 |
| 폼 | `<form>`·입력·전송 주소를 기능 ID 와 1:1 대조 | `EV-0015` 4절 |
| 주소 | 내부 링크 전수 200 확인, RT 308·410 확인 | `legacy-parity-report.md` 2절 |

반복 비교는 기준대로 **Playwright 시각 회귀 104건이 CI 에 들어 있다.**

Phase 1 에서도 REA 전수 수집이 불가능해 `ADR-002` 로 Gate 기준을 조정한 선례가 있다.
이번 2번 기준도 같은 처리가 필요해 보이지만, **Gate 기준을 바꾸는 것은 사람 결정**이라
여기서는 사실만 적고 판정을 올린다.

### 4번 기준 — 이번에 고친 잘못된 `OBSERVED` 2건

| 문서 | 잘못 적혀 있던 것 | 실제 관찰 |
|---|---|---|
| `legacy-form-contracts.md` AD-009 | 「사이트 안에는 신청 폼이 **없다**」 (`OBSERVED`, EV-0013) | `/sub/abouttch3` 한 화면만 본 결과였다. `/sub/about` 에 `POST ./about.php` 폼이 실재한다 (EV-0015) |
| `ASM-043` | `/sub/abouttch3` 은 문해력 진단 안내 | 비어 있는 「컨설팅팀」 강사진 화면이고 메뉴에서도 주석으로 꺼져 있다 (EV-0015) |

둘 다 문서를 고쳤고 `Q-ADM-16`·`Q-ADM-17` 로 원장님 확인 항목에 올렸다.

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

## Gate

**판정하지 않음 (진행 중).** Phase 5 Gate 기준은 레거시 동등성 검증을 포함하며 그 작업이
아직 남아 있다. 이번 보고는 사용자가 지시한 추가 기능 구현분의 중간 보고다.

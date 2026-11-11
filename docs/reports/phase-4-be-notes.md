# Phase 4 백엔드 작업 노트

> 담당: Backend Engineer (worktree `../munsayu-v2-be`, 브랜치 `feat/backend`)
> 소유 범위: `app/api/**`, `src/server/**`, `prisma/**`, `tests/integration/**`, 이 파일, `docs/decisions/ADR-005-*`

---

## 1. 구현한 기능 ID와 파일 경로

| 기능 ID    | 내용                                                                       | 주요 파일                                                                                                                          |
| ---------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| FM-001     | 강좌 수강 신청 (마감 확인+저장 단일 트랜잭션, idempotency)                 | `src/server/services/course-applications.ts`, `app/api/course-applications/route.ts`                                               |
| FM-002     | 설명회 예약 (1~2명, 마감 상태 409)                                         | `src/server/services/event-reservations.ts`, `app/api/event-reservations/route.ts`                                                 |
| FM-003     | 회원 가입·로그인·로그아웃·아이디/비밀번호 찾기·정보수정·비밀번호 변경·탈퇴 | `src/server/services/accounts.ts`, `src/server/auth/**`, `app/api/auth/**`, `app/api/account/**`                                   |
| PG-008/009 | 공개 시간표 조회                                                           | `src/server/services/courses.ts`, `app/api/courses/route.ts`, `app/api/campuses/route.ts`                                          |
| PG-010     | 공개 설명회 목록                                                           | `src/server/services/events.ts`, `app/api/events/route.ts`                                                                         |
| PG-011     | 예약 조회(강좌+설명회 합산 목록)·건별 취소                                 | `src/server/services/reservations.ts`, `app/api/reservations/lookup/route.ts`, `app/api/reservations/[id]/cancel/route.ts`         |
| PG-012     | 공지 공개 목록·상세 (읽기 전용, ASM-015)                                   | `src/server/services/notices.ts`, `app/api/notices/**`                                                                             |
| PG-005~007 | 강사진 공개 목록(팀별 순서)                                                | `src/server/services/instructors.ts`, `app/api/instructors/route.ts`                                                               |
| BZ-001     | 수동 마감 상태에서 신규 신청 차단 (자동 전환 없음)                         | `courses.ts` `setCourseIntake`, `events.ts` `changeEventStatus`                                                                    |
| BZ-002     | 보유기간 문구와 파기 기준을 같은 설정값으로 사용                           | `src/server/services/privacy.ts`, `app/api/privacy-notice/route.ts`                                                                |
| AD-001     | 관리자 로그인·세션 분리·매 요청 권한 확인                                  | `src/server/auth/guards.ts`, `src/server/auth/session.ts`                                                                          |
| AD-002     | 회원 검색(마스킹)·상태 변경·관리자 계정 추가/삭제 (모두 감사기록)          | `src/server/services/members.ts`, `app/api/admin/members/**`, `app/api/admin/admins/**`                                            |
| AD-003~005 | 설명회 CRUD·상태 목록·수동 상태 변경·예약 건수/참석 합계 분리 집계         | `src/server/services/events.ts`, `applications-admin.ts`, `app/api/admin/events/**`, `app/api/admin/event-status-options/route.ts` |
| AD-006     | 강사 CRUD·팀 CRUD·복수 팀 소속·팀별 노출 순서                              | `src/server/services/instructors.ts`, `app/api/admin/instructors/**`, `app/api/admin/instructor-teams/route.ts`                    |
| AD-007/008 | 강좌 CRUD·지점/접수상태 필터·신청현황 건수·신청 목록(마스킹)·상세(마스킹)  | `src/server/services/courses.ts`, `applications-admin.ts`, `app/api/admin/courses/**`, `app/api/admin/applications/**`             |
| AD-013     | 원문 조회·CSV 전체 내보내기·파기 대상 시각 설정·파기(dryRun/실행)·감사기록 | `src/server/services/privacy.ts`, `applications-admin.ts`, `audit.ts`, `app/api/admin/privacy/**`                                  |
| —          | 메일·알림·저장소 어댑터                                                    | `src/server/adapters/mail/**`, `src/server/adapters/notify/**`, `src/server/adapters/storage/index.ts`                             |
| —          | 오류→HTTP 변환, 입력 검증 진입점, 요청 횟수 제한                           | `src/server/errors.ts`, `src/server/http.ts`, `src/server/rate-limit.ts`                                                           |
| —          | 스키마·마이그레이션·seed                                                   | `prisma/schema.prisma`, `prisma/migrations/20261111085806_phase4_initial/`, `prisma/seed.ts`                                       |

### 범위에서 제외한 것

- `AD-009` 입학진단: Google Forms 외부 링크 유지, 서버 구현 없음.
- `AD-010/011` 문자신청내역·강사지원: 공개 계약 증거 없음(ASM-007).
- `AD-012` 접속자 집계: 분석 ID 환경 변수 자리만(ASM-004). 서버 집계 구현 없음.
- 공지 관리자 CRUD: 이번 범위 밖(ASM-015).

---

## 2. 실행한 명령과 결과

```
cd /Users/gimdohyeon_1/munsayu-v2-be

npx prisma format                                   # Formatted prisma/schema.prisma
npx prisma validate                                 # The schema at prisma/schema.prisma is valid
npx prisma migrate dev --name phase4_initial        # 20261111085806_phase4_initial 생성·적용
npx prisma generate                                 # Prisma Client 7.10.1 생성
npx tsx prisma/seed.ts                              # 성공 (2회 연속 실행해 idempotent 확인)

npx tsc --noEmit                                    # 출력 없음 (오류 0)
npm run lint                                        # 출력 없음 (오류 0, 경고 0)
npx prettier --check <변경한 파일 목록>              # All matched files use Prettier code style!
npm run test:integration                            # Test Files 14 passed (14) / Tests 186 passed (186)
npm run test:unit                                   # Test Files 1 passed (1) / Tests 1 passed (1)
```

마이그레이션 SQL이 스키마와 정확히 일치하는지 확인(깨끗한 DB에 `migrate deploy`로 적용된
테스트 DB 기준):

```
DATABASE_URL=postgresql://munsayu@127.0.0.1:55433/munsayu_be_test?schema=public \
  npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
# → "No difference detected."
```

`npx prettier --check .`은 Phase 0~2에 작성된 문서 50개에서 기존 경고가 남아 있다.
이번 작업에서 건드린 파일은 모두 통과하며, 저장소 전체 재포맷은 소유 범위 밖이라 하지 않았다.

### 테스트 파일 구성 (186건)

| 파일                                 | 다루는 것                                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fm-001-course-applications.test.ts` | 정상 저장, 필수값/동의/휴대폰/없는 강좌 422, 마감 409, 같은 연락처 재신청 2건 저장, 같은 key 1건+`replayed`                                       |
| `fm-002-event-reservations.test.ts`  | 정상 저장, 1명 허용/3명 422, 마감 409, 재신청 허용, 같은 key, 알림 실패에도 저장 유지                                                             |
| `pg-011-reservations.test.ts`        | 강좌+설명회 합산 목록, 건별 취소, 이름/연락처 불일치 404, 타인 건 404, 경로·본문 id 불일치 404                                                    |
| `fm-003-accounts.test.ts`            | 가입/로그인/로그아웃, rememberMe `Max-Age`, 아이디·이메일 중복 409, 차단·탈퇴 로그인 불가, 찾기 응답 동일, 재설정 토큰 1회용/만료, 세션 폐기, 429 |
| `ad-001-admin-auth.test.ts`          | 관리자 쿠키 분리, **관리자 33경로 전부 비로그인 401 / 회원 세션 403**                                                                             |
| `ad-002-members.test.ts`             | 검색 마스킹, 상태 필터, 상태 변경 감사기록+로그인 차단, 관리자 계정 생성/삭제 감사기록, 자기 계정 삭제 금지                                       |
| `ad-003-005-events.test.ts`          | 설명회 CRUD, 관리코드 중복 409, 예약 있는 설명회 삭제 금지, 상태 목록·수동 변경, **예약 건수와 참석 합계 분리 집계**                              |
| `ad-006-instructors.test.ts`         | 강사 CRUD, 한 강사 2팀 소속, 팀별 순서, 소속 삭제, 공개 목록 순서                                                                                 |
| `ad-007-008-courses.test.ts`         | 강좌 CRUD, 지점/접수상태 필터, 신청현황 건수, 신청 목록·상세 마스킹                                                                               |
| `ad-013-privacy.test.ts`             | 원문 조회 감사기록, CSV 필터 결과 전체(25건)+감사기록, 파기 시각 설정, dryRun/실제 파기, 비밀값 경로, 자동 파기 기본 꺼짐                         |
| `bz-business-rules.test.ts`          | 수동 마감 전후 신청 차단/재개, 예약 쌓여도 자동 전환 없음, 보존 문구 변경이 표시·정책 버전·파기 대상에 반영                                       |
| `pg-012-notices.test.ts`             | 공지 정렬, 미게시 글 비노출, 상세 404                                                                                                             |
| `pii-safety.test.ts`                 | 오류·정상 응답·콘솔 로그·감사기록에 이름·연락처·학교 없음, **코드에 `.php`/`munsayu.com` 참조 0건**                                               |
| `contracts-and-limits.test.ts`       | `AuditAction` enum이 계약 `AUDIT_ACTIONS`와 일치, 공개 경로 429, 요청자별 카운터 분리                                                             |

---

## 3. 새 ASM 후보 (조정자가 `open-questions.md`로 옮겨 주세요)

| 번호    | 무엇을 가정했나                                                                                                                                                                                                                                                                                       | 왜                                                                                                                  | 어디에 반영했나                               | 바꾸는 방법                                                                                                                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ASM-020 | ~~`server-only` 대신 런타임 가드 모듈 사용~~ → **조정자가 해제함** (2026-11-11). `vitest.config.mts`에 `server-only` → `next/dist/compiled/server-only/empty.js` 별칭이 추가돼 `src/server/server-only.ts`를 지우고 서버 모듈 23개를 모두 `import "server-only";`로 되돌렸다. CLAUDE.md 7장 그대로다. | —                                                                                                                   | `src/server/**` 전체                          | —                                                                                                                                  |
| ASM-021 | console 메일 어댑터는 운영에서 제목과 가린 수신자만 남기고, 운영이 아닐 때만 본문을 남긴다.                                                                                                                                                                                                           | 본문에는 재설정 토큰과 아이디가 들어간다. 로컬 개발에서 본문을 볼 수 없으면 계정 복구 흐름을 손으로 확인할 수 없다. | `src/server/adapters/mail/console-adapter.ts` | 로컬에서도 본문을 숨기려면 `NODE_ENV` 분기를 지우고 항상 가린 값만 남긴다.                                                         |
| ASM-022 | 공개 제출·조회 경로의 요청 횟수 제한은 프로세스 안 메모리로 센다(기본 60회/60초).                                                                                                                                                                                                                     | 외부 저장소(Redis 등) 의존을 Phase 4에 새로 넣지 않기로 했다.                                                       | `src/server/rate-limit.ts`                    | 서버 인스턴스가 여러 개면 인스턴스별로 따로 세므로 실제 상한이 인스턴스 수만큼 커진다. 운영 전에 공용 저장소 기반 제한으로 바꾼다. |
| ASM-023 | 비밀번호 재설정 링크의 기준 주소는 `APP_BASE_URL` 환경 변수이고, 없으면 `http://localhost:3000`을 쓴다.                                                                                                                                                                                               | 배포 도메인이 미정(D7·D8)이다.                                                                                      | `src/server/services/accounts.ts`             | `.env`에 `APP_BASE_URL`을 넣는다. 조정자 요청 항목 2번.                                                                            |
| ASM-024 | ~~공유 계약에 없는 관리자 입력을 `src/server/validation.ts`에 BE 전용으로 둠~~ → **조정자가 해제함** (2026-11-11). 4개 스키마가 `src/lib/contracts/admin.ts`로 승격돼(정의는 BE가 쓰던 것과 동일) `src/server/validation.ts`를 삭제하고 사용처 4곳을 `@/lib/contracts` import로 바꿨다.               | —                                                                                                                   | `app/api/admin/**` 4개 경로                   | —                                                                                                                                  |

---

## 4. 조정자에게 요청

1. ~~**`openapi.yaml`과 `src/lib/contracts/`에 관리자 CRUD 경로·스키마 추가**~~ → **처리 완료** (조정자 커밋 `5c7beaa`, 44경로·54오퍼레이션 기록). 남은 보완 사항은 8장에 정리했다.
   `openapi.yaml`에는 신청 목록·원문 조회·CSV·보존 설정·파기 5개 관리자 경로만 있다.
   AD-003~008 구현에 필요해 아래 경로를 추가로 만들었다. 계약 문서에 반영해 주세요.
   - `GET/POST /api/admin/courses`, `PUT/DELETE /api/admin/courses/{id}`, `POST /api/admin/courses/intake`
   - `GET/POST /api/admin/events`, `PUT/DELETE /api/admin/events/{id}`, `GET /api/admin/events/{id}/totals`, `POST /api/admin/events/status`
   - `GET/POST /api/admin/event-status-options`
   - `GET/POST /api/admin/instructors`, `PUT/DELETE /api/admin/instructors/{id}`, `POST/DELETE /api/admin/instructors/memberships`, `GET/POST /api/admin/instructor-teams`
   - `GET /api/admin/members`, `POST /api/admin/members/status`, `POST /api/admin/admins`, `DELETE /api/admin/admins/{id}`
   - `GET /api/admin/privacy/retention`, `GET /api/admin/applications/detail`
   - 공개 읽기: `GET /api/courses`, `GET /api/events`, `GET /api/campuses`, `GET /api/instructors`, `GET /api/notices`, `GET /api/notices/{id}`, `GET /api/privacy-notice`, `GET /api/auth/session`
   - ~~계약에 없어 BE가 임시로 만든 입력 스키마~~ → 계약으로 승격 완료, `src/server/validation.ts` 삭제
   - 계약에 없지만 계약 스키마(`changePasswordSchema`)가 이미 있어 만든 경로: `POST /api/account/password`
2. ~~**`.env.example`에 `APP_BASE_URL` 추가**~~ → **처리 완료** (`APP_BASE_URL`, `SEED_ADMIN_PASSWORD`, `SEED_MEMBER_PASSWORD` 추가됨).
3. ~~**`vitest.config.mts`에 `server-only` 별칭 추가**~~ → **처리 완료**. 별칭이 동작하며 통합 테스트 186건 통과를 확인했다.
4. **`package.json`에 `db:seed` 외 추가 의존성 요청 없음.** 새 npm 패키지는 하나도 추가하지 않았다.
5. **FE 연동 메모:** 서버 컴포넌트용 세션 헬퍼를 추가했다(7장 참고). 화면에서는
   `@/server/auth/server-component-session`을 직접 import한다.

---

## 5. 남은 TODO와 한계

- **알림 실제 발송 미검증(Phase 4 Gate 항목).** D4에서 문자 발송은 하지 않기로 했고 메일 업체도 미정이라
  Resend 어댑터는 실제 호출을 한 번도 하지 않았다. 스테이징 발송 확인은 업체 확정(D4 후속)과
  발신 도메인 DNS 권한(D7) 뒤에만 가능하다.
- **요청 횟수 제한이 인스턴스 단위**다(ASM-022).
- **자동 파기 스케줄러는 없다.** `POST /api/admin/privacy/purge`에 `x-purge-secret`으로 호출하는
  경로만 만들었다. 실제 주기 실행(cron)은 배포 환경 확정 뒤 조정자가 붙여야 한다.
- **`automaticPurgeEnabled`는 저장만 하고 자동 실행에 쓰이지 않는다.** 기본값은 꺼짐이고,
  켜졌을 때 스케줄러가 이 값을 보고 동작하도록 Phase 6~7에서 연결한다.
- **업로드 기능 없음.** `StorageAdapter`는 인터페이스와 로컬 자리표시만 있고 `put()`은 예외를 던진다(ASM-008).
- **동시 신청 부하 테스트는 Phase 6 범위**로 남겼다. 마감 확인과 저장은 한 트랜잭션 안에 있고
  정원 제한이 없어 동시성 충돌 조건 자체가 없다(ASM-001). 같은 key 동시 전송은
  `idempotencyKey` 유일 제약이 DB에서 막는다.
- **관리자 목록 페이지네이션 상한은 계약값 100**이다. CSV는 페이지 상한과 무관하게 전체를 내보낸다.

---

## 6. 메일 업체 비교표 (D4 후속 결정용)

> 인터넷 검색 없이 일반적으로 알려진 사실만 적었다. 가격·무료 한도는 수시로 바뀌므로
> 숫자는 모두 **확인 필요**로 표시했다. 계약 전에 각 업체 공식 가격 페이지를 직접 확인해야 한다.

| 업체         | 연동 난이도                                                                                 | 무료 구간                                                                              | 한국 수신 도달률 관련 참고사항                                                                                                                     | 발신 도메인 인증(SPF·DKIM) 절차                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resend**   | 가장 쉬움. REST 한 번 호출로 끝나고 SDK 없이 `fetch`만으로 된다. 현재 어댑터가 이 방식이다. | 개발자용 무료 구간이 있음 (월 발송량·일일 한도 **확인 필요**)                          | 전용 IP가 아닌 공용 발송 IP가 기본이라 국내 주요 메일(네이버·다음·카카오)에서 스팸 분류 가능성이 있다. 국내 수신 실측 데이터 **확인 필요**         | 대시보드에서 도메인 추가 → 안내된 DKIM(CNAME 또는 TXT)과 SPF(TXT) 레코드를 DNS에 등록 → 자동 검증. DMARC는 별도 권장                                 |
| **AWS SES**  | 중간. IAM 권한·리전·샌드박스 해제 요청이 필요하고 SDK 또는 SigV4 서명이 필요하다.           | 무료 구간 조건이 호스팅 위치에 따라 다름 (**확인 필요**). 발송 단가는 대체로 가장 낮다 | 공용 IP 풀을 쓰면 평판이 다른 발송자와 섞인다. 전용 IP를 유료로 붙일 수 있어 장기적으로 도달률 관리 폭이 가장 넓다. 서울 리전 사용 가능            | 콘솔에서 도메인 ID 생성 → Easy DKIM(CNAME 3개) 등록 → SPF는 `include:amazonses.com` TXT 추가 → MAIL FROM 도메인 설정(선택) → 샌드박스 해제 신청 필요 |
| **Postmark** | 쉬움. REST API가 단순하고 템플릿 기능이 깔끔하다.                                           | 무료 시험 발송 구간이 작다 (**확인 필요**)                                             | 거래 메일(transactional) 전용 정책이 엄격해 발송 평판 관리가 잘 되는 편으로 알려져 있다. 마케팅 메일을 섞어 보내기 어렵다. 국내 실측 **확인 필요** | 대시보드에서 Sender Signature/도메인 추가 → DKIM(TXT) 및 Return-Path(CNAME) 등록 → 검증                                                              |
| **Mailgun**  | 중간. API는 단순하지만 설정 항목과 리전 선택이 많다.                                        | 무료 구간 유무와 한도가 플랜에 따라 다름 (**확인 필요**)                               | 전용 IP 옵션이 있고 로그·분석이 상세하다. 공용 IP 평판 이슈 사례가 알려져 있어 발송량이 적으면 공용 IP 영향을 받는다. 국내 실측 **확인 필요**      | 도메인 추가 → DKIM(TXT) + SPF(TXT) + 수신 MX(선택) 등록 → 검증                                                                                       |

### 추천(기술 관점)

1순위는 **Resend 유지**다. 이미 어댑터가 구현돼 있고 코드 변경이 0이며, 계정 찾기·비밀번호 재설정만
보내는 지금 발송량에서는 단가 차이가 의미가 없다. 발송량이 늘거나 국내 도달률 문제가 실제로 생기면
**AWS SES + 전용 IP**로 옮기는 것이 비용·관리 폭에서 가장 유리하다. 어댑터 인터페이스가
`MailAdapter` 하나이므로 교체 비용은 파일 하나다.

### 사람이 해야 할 일

- **SPF·DKIM 설정에는 munsayu.com DNS 권한이 필요하다(D7).** 어떤 업체를 고르더라도
  발신 도메인 인증 레코드를 munsayu.com DNS에 등록해야 하고, 이 작업은 Claude가 할 수 없다.
  DNS 권한 확보(D7)가 확정되기 전에는 실제 발송 검증을 할 수 없다.
- 업체 선택(D4 후속)과 요금제 확정.
- 발신 주소(`MAIL_FROM`) 결정. 현재 기본값은 `no-reply@munsayu.local`(로컬 전용 가짜 주소)이다.

---

## 7. 서버 컴포넌트용 세션 헬퍼 (FE 사용법)

`src/server/auth/server-component-session.ts`에 있습니다. `@/server/auth` 배럴에는 **넣지 않았습니다** —
이 모듈만 `next/headers`에 의존하므로 배럴에 넣으면 Route Handler와 통합 테스트까지
`next/headers`를 끌어오게 됩니다. 화면에서는 아래 경로를 직접 import하세요.

```ts
import {
  getSessionUserFromCookies,
  getAdminUserFromCookies,
  getMemberUserFromCookies,
  requireAdminFromCookies,
  requireMemberFromCookies,
} from "@/server/auth/server-component-session";
```

| 함수                          | 반환                                                                     | 쓰는 곳                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `getSessionUserFromCookies()` | `{ user: SessionUser; scope: "MEMBER" \| "ADMIN" } \| null`              | 헤더처럼 회원·관리자 공용 화면. 두 세션이 모두 있으면 `ADMIN`을 돌려준다 |
| `getAdminUserFromCookies()`   | `SessionUser \| null`                                                    | **권장** — `app/admin/layout.tsx`에서 `null`이면 `redirect("/login")`    |
| `getMemberUserFromCookies()`  | `SessionUser \| null`                                                    | 회원 전용 화면에서 같은 방식                                             |
| `requireAdminFromCookies()`   | `SessionUser` (아니면 `AppError` throw: 세션 없음 401 / 회원 세션만 403) | 오류 경계로 처리하는 쪽이 편한 곳                                        |
| `requireMemberFromCookies()`  | `SessionUser` (아니면 `AppError` 401 throw)                              | 같음                                                                     |

**권장 사용 형태 (throw 대신 null + redirect):**

```tsx
// app/admin/layout.tsx (FE 소유 파일)
const admin = await getAdminUserFromCookies();
if (!admin) redirect("/login");
```

throw 방식도 함께 제공한 이유는, 화면이 아니라 Server Action에서 쓸 때는 예외가 더 자연스럽기 때문입니다.
어느 쪽을 쓰더라도 세션은 **요청마다 DB에서 다시 확인**합니다(쿠키 → 세션 행 → 계정 상태 → 역할).
회원 쿠키로는 관리자 판정이 절대 통과하지 않습니다.

---

## 8. openapi ↔ 구현 정합성 검토 결과 (2026-11-11 후속)

경로 44개 / 오퍼레이션 54개를 하나씩 대조했습니다. 경로·메서드는 구현과 1:1로 일치하고,
`$ref` 30개 모두 `components.schemas`에 정의돼 있으며 요청 스키마의 필수 항목·기본값은
`src/lib/contracts/`의 Zod 정의와 일치합니다.

### 8.1 구현을 문서에 맞춘 것 (구현 변경)

| 항목                                                            | 문서  | 바꾸기 전 구현     | 처리                                                                                        |
| --------------------------------------------------------------- | ----- | ------------------ | ------------------------------------------------------------------------------------------- |
| `DELETE /api/admin/admins/{id}`                                 | `200` | `204`              | 구현을 `200 {id, deleted:true}`로 변경                                                      |
| `DELETE /api/admin/courses/{id}`                                | `200` | `204`              | 같음                                                                                        |
| `DELETE /api/admin/events/{id}`                                 | `200` | `204`              | 같음                                                                                        |
| `DELETE /api/admin/instructors/{id}`                            | `200` | `204`              | 같음                                                                                        |
| `POST /api/admin/instructors/memberships`                       | `200` | `204`              | 구현을 `200`(반영된 소속 값 반환)으로 변경                                                  |
| `DELETE /api/admin/instructors/memberships`                     | `200` | `204`              | 구현을 `200 {…, removed:true}`로 변경                                                       |
| `DELETE /api/admin/admins/{id}` `409` "마지막 관리자 삭제 거부" | 있음  | **구현 없음**      | `deleteAdminAccount()`에 마지막 관리자 가드 추가(404 → 409 → 403 순서), 테스트 3건 추가     |
| `GET /api/instructors` `teamId` 쿼리                            | 있음  | 무시하고 전체 반환 | `listTeams({ teamId })` 필터 구현 + 테스트 추가                                             |
| `GET /api/notices` `page`·`pageSize` 쿼리                       | 있음  | 무시하고 전체 반환 | `listNotices({page,pageSize})` 페이지네이션 구현(`items/total/page/pageSize`) + 테스트 추가 |

문서에 있던 삭제 계열 `409` 중 **강좌·설명회 삭제 거부는 이미 구현돼 있었고 테스트도 있었습니다**
(`신청/예약 기록이 있으면 409`). 마지막 관리자 규칙만 빠져 있었습니다.

### 8.2 문서 쪽 보완 요청 (openapi는 공유 소유라 수정하지 않았습니다)

구현이 실제로 돌려주지만 문서에 적히지 않은 상태 코드입니다. 전부 **문서가 좁은** 경우이고
구현을 줄일 이유가 없어 그대로 두었습니다. 문서에 추가해 주세요.

1. **`404 NOT_FOUND` 누락** — `DELETE /api/admin/courses/{id}`, `DELETE /api/admin/events/{id}`,
   `DELETE /api/admin/instructors/{id}`, `DELETE /api/admin/instructors/memberships`,
   `POST /api/admin/courses/intake`, `POST /api/admin/events/status`,
   `POST /api/admin/members/status`, `DELETE /api/admin/admins/{id}`
   (대상이 없거나 관리자 계정이 아닐 때).
2. **`422 VALIDATION_FAILED` 누락** — 본문·쿼리를 받는 모든 관리자 오퍼레이션.
   문서에는 `POST /api/admin/courses` 한 곳에만 있습니다. 공유 계약 Zod로 검증하므로
   입력이 계약과 다르면 어디서든 422가 나갑니다. 특히
   `PUT /api/admin/courses/{id}`·`PUT /api/admin/events/{id}`·`POST /api/admin/events`
   (없는 `campusId`/`statusOptionId` → 422), `POST /api/admin/instructors/memberships`
   (없는 `instructorId`/`teamId` → 422), `PUT /api/admin/privacy/retention`,
   `POST /api/admin/privacy/purge-schedule`, `GET /api/admin/applications(/export,/detail)`.
3. **`409 CONFLICT` 누락** — `POST /api/admin/event-status-options`(상태 이름 중복),
   `POST /api/admin/instructors`·`PUT /api/admin/instructors/{id}`(프로필 코드 중복),
   `PUT /api/admin/events/{id}`(관리코드 중복), `POST /api/admin/instructor-teams`(팀 이름 중복).
4. **문서에 없는 쿼리 파라미터** — `GET /api/admin/events`는 구현이 `campusId` 필터를 받습니다
   (문서에는 파라미터가 없음). 관리자 화면에서 지점 탭을 만들 때 필요하므로 유지했습니다.
5. **`GET /api/admin/events/{id}/totals`** — 없는 설명회 id면 404가 아니라
   `{reservationCount:0, attendeeTotal:0}`을 돌려줍니다. 집계 경로라 404로 바꾸지 않았습니다.
   문서에 "없는 id는 0 집계" 한 줄을 넣어 주면 좋겠습니다.
6. **`src/lib/contracts/admin.ts` 주석 위치** — `/** 한 강사가 여러 팀에 소속될 수 있고 팀별 노출 순서를 둔다. (ASM-003) */`
   주석이 `instructorTeamCreateSchema` 위에 붙어 있습니다. 원래 설명 대상은 바로 아래의
   `instructorTeamMembershipSchema`입니다. 동작에는 영향이 없지만 읽는 사람이 헷갈립니다.

### 8.3 후속 라운드에서 찾은 실제 버그 1건

`FM-001` 동시 전송 테스트를 추가하면서 **보존 설정 기본 행 생성 경합** 버그를 찾았습니다.
`getRetentionSetting()`이 `findUnique` → 없으면 `create` 순서였는데, 신청 두 건이 동시에
들어오면 두 요청이 같은 기본 행(`id = 1`)을 함께 만들려 해 한쪽이 `P2002`로 실패하고
**500이 나갔습니다.** 유일 제약 위반을 잡아 먼저 만들어진 행을 읽도록 고쳤습니다
(`src/server/services/privacy.ts`). 같은 방식의 복구를 `course-applications.ts`·
`event-reservations.ts`의 `idempotencyKey` 경합에도 넣어, 경합에서 두 번째 요청이
유일 제약에 걸리면 500 대신 기존 건을 `replayed: true`로 돌려줍니다.

`idempotencyKey` 경합 복구 분기는 **방어 코드**입니다. 같은 key로 5건을 동시에 보내 보면
각 요청이 트랜잭션 전에 DB 왕복을 한 번 하기 때문에 실제로는 트랜잭션 안의 사전 조회에서
걸러져 `P2002`까지 가지 않았습니다(임시 로그로 확인). 그래서 분기가 의존하는 판별 조건은
별도 테스트로 확정해 두었습니다 — 같은 key로 한 건 더 저장하면 DB 유일 제약이 막고
`isUniqueViolation()`이 그 오류를 재전송 신호로 분류함을 확인합니다. 동시 전송 테스트 쪽은
"상태 코드 전부 201 / 저장 1건 / id 동일 / `replayed:false` 정확히 1건"이라는 불변식을 검증합니다.

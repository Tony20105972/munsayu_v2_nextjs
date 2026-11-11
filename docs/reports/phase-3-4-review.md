# Phase 3·4 독립 리뷰

> 리뷰 일자: 2026-11-11 · 대상: `feat/phase-3-4` (`main` 대비 60커밋, 319파일 변경)
> 리뷰어는 작업 세션의 결론을 보지 않았고, `docs/reports/phase-3-fe-notes.md`·`phase-4-be-notes.md`는
> **검증할 주장**으로만 읽었습니다. 아래 모든 수치는 리뷰어가 직접 실행해 관찰한 값입니다.
> 운영 사이트(munsayu.com)에는 요청을 보내지 않았습니다.

---

## 차단 (Blocking)

### B-1. 개인정보 「보유기간」 문구가 설정값과 연결돼 있지 않다 — BZ-002 미충족

**무엇이 잘못됐는지**
BZ-002 계약은 `docs/contracts/migration-matrix.md:17`에서 *"설정값을 동의 문구·파기에서 공용"* /
테스트 계약 *"설정 변경이 표시·파기 대상에 반영"* 으로 확정돼 있습니다. 그런데 신청자가 실제로 보는
동의 안내의 「보유기간」 줄은 DB 설정값(`PrivacyRetentionSetting`)이 아니라 **코드에 박힌 상수**입니다.

- `src/components/public/course-reservation-dialog.tsx:210` → `COURSE_PRIVACY_CONSENT.retention`
  (상수: `src/lib/contracts/applications.ts:42`)
- `src/components/public/event-reservation-dialog.tsx:195` → `EVENT_PRIVACY_CONSENT.retention`
  (상수: `src/lib/event-consent.ts:16`)
- 두 모달의 props는 `{ course, onClose }` / `{ event, onClose }` 뿐이라 설정값이 들어올 경로가 없습니다
  (`course-reservation-dialog.tsx:23-26`, `event-reservation-dialog.tsx:24-27`).
- 설정값을 돌려주는 `GET /api/privacy-notice`(`app/api/privacy-notice/route.ts`)는 **앱 어디에서도
  호출되지 않습니다**(`grep -rn "privacy-notice" app src` → 라우트 파일 1건뿐).

그 결과 세 가지가 동시에 틀어집니다.

1. **관리자 화면이 거짓을 안내한다.** `app/admin/(authed)/privacy/page.tsx:49`와
   `src/components/admin/privacy-panels.tsx:31,38`은 *"여기서 바꾼 문구가 공개 신청 폼의 「보유기간」
   안내에 그대로 나오고"* 라고 적어 두었지만, 보존 설정을 바꿔도 공개 폼 문구는 바뀌지 않습니다.
2. **동의 기록의 정책 버전이 신청자가 본 문구와 다르다.** `prisma/seed.ts:368`이
   `eventRetentionPolicy`에 **강좌** 문구(`"해당 강좌 종강 및 정규 등록 안내 완료 시점 즉시 파기"`)를
   넣고, `src/server/services/privacy.ts:54-58`이 그 값이 `COURSE_PRIVACY_CONSENT.retention`과 같으므로
   `retentionPolicyVersion = "legacy-ev-0006-v1"`을 저장합니다. 그런데 설명회 신청자가 화면에서 본 문구는
   `"해당 설명회 종료 및 안내 완료 시점 즉시 파기"` 입니다. **즉 설명회 예약의 동의 기록은 처음부터
   신청자가 보지 않은 문구를 가리킵니다.** BLUEPRINT 10장 [확정] *"동의 문구를 그대로 보존하고, 동의
   여부와 시각을 저장"* 에 어긋납니다.
3. **같은 문구 상수가 두 곳에 중복 정의돼 있다.** `src/lib/contracts/applications.ts:53-62`
   (`policyVersion` 포함, BE가 쓰는 값)과 `src/lib/event-consent.ts:12-19`(`policyVersion` 없음, 화면이
   쓰는 값). 화면은 후자를 씁니다. 공유 계약이 단일 원본이어야 한다는 CLAUDE.md 9장 규칙과 충돌합니다.

**어떻게 확인했는지**
- `grep -rn "EVENT_PRIVACY_CONSENT\|COURSE_PRIVACY_CONSENT" app src` 로 화면이 상수만 읽는 것을 확인.
- `grep -rn "privacy-notice\|privacyNotice" app src` → 호출처 0건.
- `tests/integration/bz-business-rules.test.ts:170-206`(BZ-002 "표시 문구" 테스트)을 읽어, 검증 대상이
  **쓰이지 않는 `/api/privacy-notice` 응답**이고 실제 표시 경로가 아님을 확인. 테스트는 통과하지만
  Gate 항목은 참이 되지 않습니다.
- `prisma/seed.ts:362-371`과 `src/server/services/privacy.ts:50-61`을 함께 읽어 설명회 쪽
  `retentionPolicyVersion`이 강좌 문구 버전으로 떨어지는 것을 확인.

**왜 차단인지**
문서화된 계약(BZ-002)과 BLUEPRINT 10장 [확정] 규칙을 깨고, 미성년자·학부모 개인정보의 **보유기간 고지와
동의 기록이 서로 다른 값을 가리키는** 상태입니다. Phase 4 Gate의 "모든 `FM-*`, `BZ-*` 통합 테스트 통과"가
초록이지만 실제로는 충족되지 않았고(테스트가 실사용 경로를 보지 않음), 관리자 화면이 운영자에게
사실과 다른 안내를 합니다.

**제안**
공개 모달에 서버(Server Component)에서 읽은 `courseRetentionPolicy`/`eventRetentionPolicy`를 prop으로
내려 주고, `src/lib/event-consent.ts`를 지워 계약 상수 하나만 남기고, 설명회 기본 설정값도 설명회 문구로
바꾸고(`seed.ts`·`getRetentionSetting()`), BZ-002 테스트를 **화면 렌더 결과**(E2E 또는 컴포넌트 단언)로
옮기는 것이 최소 수정입니다.

---

### B-2. 코드의 ASM 28개가 가정 등록부(`open-questions.md`)에 없다

**무엇이 잘못됐는지**
CLAUDE.md 4장은 *"ASM은 `docs/reports/open-questions.md`에 번호·가정·이유·반영 위치·변경 방법·원장님
질문을 기록합니다. 구현 시 해당 코드 위치에도 `// ASM-xxx` 주석을 남깁니다"* 로 규정합니다.
`docs/contracts/phase-3-4-ownership.md`도 등록부 갱신을 조정자 책임으로 못 박았습니다
(*"FE는 … ASM 후보를 적고 조정자가 옮긴다"*). 그런데 옮겨지지 않았습니다.

코드에만 있고 등록부에 없는 번호 28개:
`ASM-040, 041, 043, 044, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057, 058,
070, 071, 072, 073, 074, 075, 077, 078, 079, 080, 081`

예: `src/lib/site-config.ts:70`(`ASM-040` 메뉴 하위 항목 추정),
`app/(public)/sub/abouttch3/page.tsx:8`(`ASM-043` 페이지 내용 전체를 추론으로 구성),
`src/lib/event-consent.ts:8`(`ASM-052` 설명회 동의 문구 신규 작성),
`app/(public)/sub/Check/page.tsx:56`(`ASM-053` 문자 발송 문구 유지),
`src/components/public/facility-panel.tsx:47`(`ASM-081` 분당점 시설 본문 미관찰).
이들은 **원장님께 물어야 할 질문**(페이지 내용·동의 문구·메뉴 구성)을 담고 있는데, 질문 목록이 모이는
단일 지점에서 빠져 있습니다.

반대로 등록부에만 있고 코드에 없는 번호: `ASM-011, 016, 017, 024, 025` (016/017/025는 문서·자산 관련이라
정상, 024는 해제됨). 번호 018·019·020은 등록부에 아예 없습니다.

**어떻게 확인했는지**
```
grep -rhoE "ASM-[0-9]+" app src prisma tests scripts proxy.ts | sort -u   → 45개
grep -rhoE "ASM-[0-9]+" docs/reports/open-questions.md | sort -u           → 22개
comm -23 (코드) (등록부)                                                   → 28개
```
`docs/reports/phase-3-fe-notes.md:154`·`:618`에 *"새 ASM 후보 (조정자가 `open-questions.md` 로 옮길 것)"*
표가 있고, 그 내용이 등록부에 반영되지 않은 것을 확인했습니다.

**왜 차단인지**
명시된 프로젝트 규칙(CLAUDE.md 4장) 위반이고, Phase 종료 산출물인 "사용자 결정이 필요한 항목" 목록이
불완전해집니다. 원장님께 물어야 할 질문 20여 건(페이지 본문, 설명회 동의 문구, 문자 발송 문구 등)이
공식 질문표에 없는 상태로 Phase가 닫히면 Phase 5 이후에 그대로 유실됩니다.

---

## 수정 권장 (Recommended)

### R-1. `/sub/Check`의 「안내 문자 발송 트랙」 문구가 실제 동작과 다르다
`app/(public)/sub/Check/page.tsx:30-33`은 *"예약 및 취소가 정상 완료되면 학부모님 연락처로 카카오
알림톡 또는 확인 문자가 실시간 자동 발송됩니다"* 라고 안내합니다. 레거시 원문(EV-0008,
`docs/evidence/dom/phase1-check.yml:57-58`)을 그대로 보존한 것은 규칙에 맞지만, D4 결정은 **발송 없음**이고
`src/server/adapters/notify/console-adapter.ts`만 존재합니다. 또 강좌 동의 문구의 수집 **목적**에도
`"예약 확정 안내 문자 발송"`(`src/lib/contracts/applications.ts:40`)이 들어 있어, 수행하지 않는 목적으로
연락처를 수집하는 고지가 됩니다. `ASM-053`에 질문으로 남겨 두긴 했으나(등록부에는 없음 — B-2),
공개 전에 반드시 문구를 고치거나 발송을 붙여야 합니다. 사용자(학부모)가 바로 마주치는 오안내입니다.

### R-2. 자동 파기 설정이 실제 파기 경로를 제어하지 않는다
`automaticPurgeEnabled`는 저장·표시만 되고(`src/server/services/privacy.ts:69-84`),
`isAutomaticPurgeEnabled()`(`:89-92`)는 **호출처가 0건**입니다. 반면 예약 실행용 경로
`POST /api/admin/privacy/purge`는 `x-purge-secret`만 맞으면 설정값과 무관하게 비가역 비식별화를 실행합니다
(`app/api/admin/privacy/purge/route.ts:14-17`). 지금은 스케줄러가 없어 실해가 없고
`phase-4-be-notes.md` 5장에 정직하게 공개돼 있지만, Phase 6~7에서 cron을 붙이는 순간
"자동 파기 꺼짐" 상태에서도 파기가 돌아갑니다. `runPurge()` 안에서 `dryRun=false` + 비밀값 경로일 때
`automaticPurgeEnabled`를 확인하도록 지금 막아 두는 쪽이 안전합니다.

### R-3. 관리자 회원 검색 키워드(이름)가 URL 쿼리에 남는다
`app/admin/(authed)/members/page.tsx:99`의 검색 폼이 `method="get"`이라 회원 이름이
`/admin/members?keyword=<이름>` 형태로 주소창·브라우저 기록·웹서버 접근 로그에 남습니다
(`src/server/services/members.ts:48-57`이 `name` contains 검색). 신청자 조회(`POST` 본문)는 올바르게
처리됐는데 회원 검색만 예외입니다. `POST` + `redirect` 또는 Server Action으로 바꾸는 것을 권합니다.
또 이 검색은 감사기록 대상이 아닙니다(마스킹된 값만 돌려주므로 AD-013 위반은 아니지만, 회원 존재
여부를 확인하는 조회라 기록을 남길지 정해 두는 편이 좋습니다).

### R-4. 공개 GET 라우트 5곳이 Zod 검증을 건너뛴다
CLAUDE.md 6장(*"검증: Zod — 모든 서버 입력 경계"*)·7장과 BLUEPRINT 2장 [확정] 요청 흐름
(*"입력 → Zod 검증 → …"*)에 어긋납니다.
- `app/api/courses/route.ts:7` `campusId` 원문 사용
- `app/api/events/route.ts:7` `campusId` 원문 사용
- `app/api/instructors/route.ts:7` `teamId` 원문 사용
- `app/api/notices/[id]/route.ts:10` 경로 `id` 원문 사용
- `app/api/admin/events/[id]/totals/route.ts:11` 경로 `id` 원문 사용

Prisma 파라미터 바인딩 덕에 주입 위험은 없고 잘못된 값은 `[]`/404로 끝나므로 동작상 피해는 없습니다.
다만 [확정] 규칙에서 벗어난 자리가 기록 없이 5곳 생겼습니다. `cuidLikeIdSchema`로 감싸면 끝나는
수정입니다. (`notices` 목록과 모든 POST/PUT 경계는 올바르게 Zod를 통과합니다.)

### R-5. 마감 확인과 저장이 한 트랜잭션이지만 행 잠금이 없다
`src/server/services/course-applications.ts:30-61`과
`src/server/services/event-reservations.ts:30-62`는 규칙대로 `$transaction` 안에서 접수 상태를 읽고
저장합니다. 다만 PostgreSQL 기본 격리수준(READ COMMITTED)에서 `Course`/`EventStatusOption` 행을
잠그지 않으므로, 관리자가 「접수마감」으로 바꾸는 트랜잭션이 *조회 직후 ~ INSERT 직전* 에 커밋되면
마감 이후 신청이 1건 저장될 수 있습니다. 정원 경합이 없다는 설계(ASM-001) 때문에 실무 영향은 작지만,
"마감 상태에서 신청 차단"이라는 Gate 항목의 취지는 `SELECT … FOR UPDATE`(또는 저장 후 재확인)로만
완전히 보장됩니다. `phase-4-be-notes.md` 5장은 *"동시성 충돌 조건 자체가 없다"* 고 적었는데, 이 한 가지
조건은 남아 있습니다.

### R-6. 요청 횟수 제한 키가 `x-forwarded-for`에만 의존한다
`src/server/rate-limit.ts:24-28`은 헤더가 없으면 전원 `"unknown"` 한 버킷을 공유합니다. 헤더를
세팅하지 않는 배포 환경에서는 사이트 전체가 60회/60초로 묶여 정상 사용자가 429를 받고, 반대로
헤더를 덮어쓰지 않는 환경에서는 값을 바꿔 가며 보내면 제한을 우회할 수 있습니다. ASM-022는 "프로세스
메모리"라는 한계만 적고 헤더 신뢰 문제는 적지 않았습니다. 또 예약 조회(`POST /api/reservations/lookup`,
이름+연락처만으로 타인 신청 내역을 조회)는 60회/분이면 열거 시도 여지가 있어 이 경로만 더 낮추는
것을 권합니다.

### R-7. 알림 실패가 "재시도 대상"으로 기록되지 않는다
BLUEPRINT 5장 [확정]: *"알림 발송 실패가 신청 저장을 취소시키지 않습니다. 저장 후 발송하고, 실패하면
재시도 대상으로 기록합니다."* `src/server/adapters/notify/index.ts:24-32`의 `notifyQuietly()`는 실패를
`console.warn("notify_failed", …)`로만 남기고 DB에 재시도 대상을 만들지 않습니다. 현재 실제 발송이
없어 피해는 없지만, [확정] 규칙의 절반이 미구현이고 어느 노트에도 적혀 있지 않습니다.

### R-8. `/sub/schedule.n`의 관찰된 title이 기록 없이 바뀌었다
`docs/legacy/legacy-seo-map.md`는 `/sub/schedule.n`의 관찰 title을
`문해와 사유(초등독서논술학원)`(EV-0006)로 적었는데, 구현은
`"대치본원 시간표 | 문해와 사유(초등독서논술학원)"`을 씁니다
(`app/(public)/sub/schedule.n/page.tsx:15`). `src/lib/metadata.ts:22-26`의 자기 규칙
(*"관찰된 title은 그대로 넣고, 미관찰 페이지만 접미사 규칙"*)과도, BLUEPRINT 8장 [확정]
(*"레거시의 title … 을 페이지마다 이식"*)과도 어긋납니다. `phase-3-fe-notes.md:211`의 "관찰된 title 일치"
목록에서도 이 경로만 빠져 있어, 의도된 개선인지 누락인지 구분할 수 없습니다. 접미사 유지가 더 낫다고
판단했다면 차이 사유 표에 한 줄 적어 주세요.

### R-9. 보안 헤더(CSP 등)가 전혀 없다
BLUEPRINT 10장 [확정]: *"보안 헤더(CSP 등)와 요청 횟수 제한(rate limit)을 적용합니다."*
`next.config.ts`에 `headers()`가 없고 `proxy.ts`도 보안 헤더를 붙이지 않습니다
(`grep -rn "Content-Security-Policy\|X-Frame-Options\|Strict-Transport\|Referrer-Policy" next.config.ts proxy.ts src app` → 0건).
Phase 6가 "Performance & Security"이므로 이월 자체는 타당하지만, 이월 사실이 어느 문서에도 없습니다.
특히 비밀번호 재설정 토큰이 URL 쿼리에 실려 다니므로(`/account/password-reset?token=…`)
최소한 `Referrer-Policy`는 지금 넣어 두는 것이 안전합니다.

### R-10. 레거시 공지 상세 URL은 308 뒤에 404가 된다
`proxy.ts:63-67`은 `/bbs/board.php?bo_table=notice&wr_id=7` → `/notice/7`로 308합니다. 그런데 신규
`Notice.id`는 cuid이고 과거 데이터 이관이 없으므로(D1), 실제 레거시 공지 주소는 전부 308 → 404로
끝납니다. `tests/e2e/route-compatibility.spec.ts:16-23`은 308 상태와 `Location`만 보기 때문에 통과합니다.
Phase 2 계약(`route-compatibility-map.json`)의 결정이라 Phase 3·4의 결함은 아니지만, 공지 목록(`/notice`)
으로 308하거나 레거시 `wr_id` 대응표를 두는 쪽이 사용자에게 낫습니다.

### R-11. 관리자 Server Action 29개에는 권한 자동 테스트가 없다
`src/lib/actions/admin.ts`의 29개 Action은 모두 첫 줄에서 `requireAdminFromCookies()`를 호출합니다
(리뷰어가 29곳 전부 눈으로 확인). 다만 `tests/integration/ad-001-admin-auth.test.ts`의 401/403 순회는
**Route Handler 33개만** 돌고 Action은 포함하지 않습니다. 화면이 아니라 Action을 직접 POST하는 요청이
막히는지는 사람이 코드를 읽어야만 알 수 있습니다. 목록 기반 순회 테스트를 Action에도 만들어 두면
새 Action을 추가할 때 가드 누락을 자동으로 잡을 수 있습니다.

### R-12. 작은 정리거리
- `src/server/services/privacy.ts:89-92` `isAutomaticPurgeEnabled()` — 호출처 0건(죽은 코드).
- `app/api/privacy-notice/route.ts` — 앱 내 호출처 0건. openapi에는 공개 API로 있으니 의도된 것이라면
  주석에 "외부용"이라고 적어 주세요(B-1과 함께 정리 대상).
- `src/lib/contracts/applications.ts:53` `EVENT_PRIVACY_CONSENT` — 화면은 `src/lib/event-consent.ts`
  쪽을 쓰므로 계약 쪽은 BE만 참조. 중복(B-1).
- `docs/contracts/phase-3-4-ownership.md:5`와 `phase-3-fe-notes.md:175`가 아직 `middleware.ts`를
  가리킵니다. 실제 파일은 `proxy.ts`입니다.
- `docs/BLUEPRINT.md` 8장 "매핑 요약"은 `유지 10개`라고 적었는데
  `route-compatibility-map.json`의 `maintain` 규칙은 11개입니다(Phase 2 잔재).
- `prisma/seed.ts:214-250`은 `NODE_ENV` 확인 없이 `loginId: "admin"` / 기본 비밀번호
  `fake-admin-pw-0000` 계정을 만듭니다. 운영 DB에 실수로 돌면 바로 백도어가 되므로
  `NODE_ENV === "production"`에서 중단하는 가드를 권합니다.

---

## 확인한 것 (Verified)

실행 명령과 리뷰어가 실제로 관찰한 결과:

| 명령 | 관찰 결과 |
|---|---|
| `npx tsc --noEmit` | 종료 코드 0, 출력 없음 |
| `npm run lint` | 종료 코드 0, 경고·오류 0 |
| `npm test` (vitest unit+integration) | **Test Files 17 passed (17) / Tests 210 passed (210)**, 10.76s |
| `npm run e2e` | **37 passed**, 9.5s |
| `npm run e2e:visual` | **104 passed**, 11.5s (17경로 × 2폭 × 시각회귀·반응형·이미지) |
| `npm run build` | 성공. `ƒ Proxy (Middleware)` 등록 확인 |
| `npm run check:assets` | `public/` 33개 / 8.05MB, 2MB 초과 0건 |

`docs/reports/migration-status.md`의 테스트 수치(210 / 37 / 104 / 33개 8.05MB)는 리뷰어 관찰값과
**정확히 일치**합니다. 수치를 부풀린 흔적은 없습니다.

직접 검증해 문제가 없다고 판단한 항목:

1. **중복 신청 허용.** `prisma/schema.prisma`의 `@unique`는 11개이며 신청·예약 쪽은 `idempotencyKey`
   하나뿐입니다. `(courseId, guardianPhone)` 같은 신청자 유일 제약, 중복 신청 409, "이미 신청하셨습니다"
   류 분기가 **전부 없음**을 `grep -rn "중복 신청\|이미 신청\|duplicate" src app prisma`로 확인했습니다.
   남아 있는 409는 `INTAKE_CLOSED`와 관리자/계정 중복(아이디·이메일·관리코드·프로필코드·팀 이름)뿐입니다.
   e2e `FM-001 같은 연락처로 다시 신청할 수 있다` 통과.
2. **idempotency 재전송.** 트랜잭션 안 사전 조회 + `P2002` 복구(`isUniqueViolation`,
   `src/server/db.ts:22-28`)로 같은 키 재전송은 기존 건을 `replayed: true`로 돌려주고 새 행을 만들지
   않습니다. 동시 전송 불변식 테스트(201 전부 / 저장 1건 / id 동일 / `replayed:false` 정확히 1건)가
   있습니다.
3. **마감 차단.** 강좌는 `intakeStatus !== "OPEN"`, 설명회는 `statusOption.isClosed`만 보고 409를
   던집니다. 정원 숫자로 막는 코드는 없습니다. e2e `BZ-001 … 공개 화면에서 신청할 수 없다` 통과.
   (한 가지 경합 조건은 R-5)
4. **권한.** `app/api/admin/**`의 **33개 오퍼레이션 전부**가 `requireAdmin(request)`를 통과합니다
   (라우트별 grep으로 1:1 확인). `tests/integration/admin-routes.ts`의 경로 표도 33개 오퍼레이션을
   빠짐없이 덮고 있어(중복 제거 후 33 = 구현 33) 비로그인 401 / 회원 세션 403이 전수 검증됩니다.
   회원·관리자 쿠키는 이름과 `SessionScope`로 완전히 분리되고(`src/server/auth/cookies.ts:9-12`),
   매 요청 `쿠키 → 세션 행 → 만료 → 계정 상태 → 역할`을 다시 확인합니다
   (`src/server/auth/session.ts:60-77`). `app/admin/(authed)/layout.tsx:29-32` 레이아웃 가드 외에
   Server Action 29개가 각자 다시 확인합니다(화면 숨기기에 의존하지 않음).
5. **비밀번호·토큰.** argon2id(m=19456, t=2, p=1), 해시 형식 오류도 불일치와 동일 처리
   (`src/server/auth/password.ts`). 세션·재설정 토큰은 32바이트 난수이고 DB에는 SHA-256만 저장
   (`src/server/auth/tokens.ts`). 재설정 토큰은 `usedAt` + 30분 만료로 **1회용**이고, 사용 시
   비밀번호 변경·세션 전체 폐기를 한 트랜잭션에서 처리합니다(`accounts.ts:132-147`).
   로그인 시도 제한은 DB 기록 기반(5회/10분 → 15분 잠금)으로 재시작 후에도 유지됩니다.
   비밀값 비교는 상수 시간(`secretEquals`)입니다.
6. **개인정보.** 관리자 목록·상세는 서버에서 마스킹한 값만 내보내고(`applications-admin.ts`,
   `members.ts`), 원문 조회는 `PII_VIEW`, CSV는 `CSV_EXPORT` 감사기록을 반드시 남깁니다.
   감사기록에는 필터 **이름과 건수**만 들어갑니다(`audit.ts:30-42`). 오류 응답은 `AppError.message` +
   필드 이름/사유만 담고 제출값을 넣지 않습니다(`src/server/http.ts:19-33`).
   `tests/integration/pii-safety.test.ts`가 오류 응답·정상 응답·콘솔 로그·감사기록 전부를 검사하며
   통과합니다. 모든 개인정보 응답에 `Cache-Control: no-store`.
7. **seed·테스트 데이터.** `prisma/seed.ts`에 신청자 개인정보가 **한 건도 없고**, 계정은
   `가상관리자/가상회원` + `@example.test` + `010-0000-000x`, 강사는 `가상강사A~C`입니다.
   통합 테스트는 `홍길동 / 010-1234-5678 / 가상초등학교`만 씁니다. 실제 개인정보 흔적 없음.
8. **파기.** 행을 지우지 않고 PII 칸만 `"파기됨"`으로 바꾸고 `purgedAt`을 기록하며, 강좌·설명회 양쪽을
   한 트랜잭션에서 처리합니다(`privacy.ts:139-170`). `dryRun`이 기본 흐름이고 화면은 미리 세기 결과를
   본 뒤에만 실제 파기 버튼을 엽니다. 설정 기본값 `automaticPurgeEnabled = false`(스키마·마이그레이션·
   seed·`getRetentionSetting()` 네 곳 모두 `false`).
9. **계약 정합성.** openapi의 **경로 44개 / 오퍼레이션 54개가 구현과 1:1로 정확히 일치**합니다
   (스크립트로 양쪽을 파싱해 차집합 0, 메서드 불일치 0). `phase-4-be-notes.md` 8.2가 보완을 요청한
   404·409·422와 `GET /api/admin/events`의 `campusId`, `totals`의 "없는 id는 0 집계" 설명이 모두
   openapi에 반영된 것을 확인했습니다. `CourseApplicationInput`·`EventReservationInput`·
   `RegisterInput`의 필수값·길이·enum·`attendeeCount` 상한 2가 `src/lib/contracts/`의 Zod 정의와 같습니다.
10. **레거시 URL.** `route-compatibility-map.json`의 19개 규칙(유지 11 / 308 5 / 410 2 / 외부 1)과
    `proxy.ts`가 일치하고, e2e가 **매핑 파일을 직접 읽어** 308/410/200을 검증합니다. 410 응답 본문에
    `/admin`이 노출되지 않는 것까지 단언합니다. 유지 경로 11개 전부 App Router 페이지로 존재합니다.
11. **레거시 PHP 의존 0건.** `tests/integration/pii-safety.test.ts`의 "레거시 의존 제거" 테스트가
    주석을 제거한 뒤 `fetch`/`redirect`/`href`의 `.php`·`munsayu.com` 사용을 검사하고, `proxy.ts`의
    `.php` 문자열이 **출발지로만** 쓰이는지, `site-config.ts`의 `munsayu.com`이 canonical 오리진으로만
    쓰이는지까지 확인합니다. 통과.
12. **레거시 충실도(직접 대조).** 증거 파일과 구현을 글자 단위로 비교했습니다.
    - 홈(`docs/evidence/dom/phase1-home.yml`) — 히어로 키커/제목/본문/버튼 2개와 주소, 바로가기 4개
      순서, 5단계 학습 5칸, 교육과정 카드, COSMO 3교시, 통계 4칸, 상담 시간, 푸터 전체가 관찰값과
      동일. 상담센터 상단 바·사업자 정보도 원문 그대로.
    - 푸터(`phase1-course.yml:131-200`) — `ABOUT`/`PROGRAM`/`RESERVE`/`SNS` 4묶음의 제목·링크·순서·주소,
      지점 주소·전화, 대표·개인정보관리책임자·사업자번호·저작권 줄이 모두 일치.
    - `/sub/Check`(`phase1-check.yml`) — 배너 2줄, 입력란 2개, **주의사항 5개 본문 전문**이 일치.
    - 수강 예약 모달(`phase1-course-reservation-dialog.yml:124-181`) — 입력란 3개와 placeholder,
      희망 과정 3개, 학년 7개, 동의 안내 3줄, 체크박스 문구, 제출 버튼 문구가 일치.
    - 메타데이터 — `/`·`/sub/Presentation`은 관찰 title 그대로, `/login`·`/register`·`/notice`는
      `로그인 | …`·`회원가입약관 | …`·`공지사항 페이지 | …`로 `legacy-seo-map.md`와 일치
      (예외 1건은 R-8).
    - 설명회 신청 폼만 신규 설계이며 그 사실이 코드 주석과 노트에 모두 적혀 있습니다(의도된 예외).
13. **자산.** `legacy-assets.json`의 37개 항목이 커밋된 `public/**`·`app/*icon*` 파일과 양방향으로
    정확히 대응합니다(누락 0, 미등록 0). 강사 사진 GPS EXIF 제거, Unsplash 핫링크 제거(로컬화),
    외부 호스트 직링크 0건을 확인했습니다. 시각 회귀 `images.spec.ts`가 깨진 이미지 0건을 단언합니다.
14. **스텁·찌꺼기 0건.** `grep -rn "STUB\|TODO\|FIXME" app src prisma` → 0건.

---

## Gate 판정

### Phase 3 Gate — **부분 (조건부 PASS)**

| 항목 | 판정 | 근거 |
|---|---|---|
| 모든 `PG-*` 구현, 시각 회귀(1440/390) 통과 또는 차이 사유 기록 | **충족** | PG-001~014 전부 구현. `npm run e2e:visual` 104건 통과(17경로×2폭), 차이 22건이 `phase-3-fe-notes.md` 12.3에 "의도된 개선/수정 완료"로 분류돼 있음 |
| 레거시 URL 매핑·리다이렉트 테스트 통과 | **충족** | `tests/e2e/route-compatibility.spec.ts`가 매핑 JSON을 읽어 19규칙 전부 검증, 통과. 단 공지 상세 308의 착지가 404(R-10) |
| 페이지별 메타데이터 이식 확인 | **부분** | 19경로 모두 title·description·canonical·OG 보유. 그러나 `/sub/schedule.n`의 OBSERVED title이 기록 없이 교체됨(R-8), 자동 단언은 없음 |
| 권리 미확인 자산 0건 | **부분** | 37개 전부 근거가 기록됨(D6 27건 / Unsplash License 8건). 다만 2건이 `"Unsplash 가능성 있음(출처 확인 필요)"`, 8건의 `photoPageUrl`이 `"확인 필요"`로 남아 "미확인 0건"이라 단언하기는 어려움 |
| 반응형·접근성 기본 점검 | **충족** | `responsive-a11y.spec.ts` 34건(가로 스크롤 없음·`h1` 정확히 1개·레이블 없는 폼 컨트롤 0개) 통과. 관리자·공개 레이아웃에 본문 건너뛰기 링크 존재 |

→ 차단 항목 B-2(ASM 등록부)를 해소하고 메타데이터·자산 두 칸의 단서를 문서로 정리하면 PASS입니다.

### Phase 4 Gate — **FAIL**

| 항목 | 판정 | 근거 |
|---|---|---|
| 모든 `FM-*`, `BZ-*` 통합 테스트 통과 | **미충족** | 테스트는 전부 초록(210건)이지만 **BZ-002의 "표시 문구" 검증이 실사용되지 않는 `/api/privacy-notice`를 대상으로 하고, 실제 공개 폼은 하드코딩 상수를 표시**합니다(B-1). 계약이 요구한 "설정 변경이 표시에 반영"은 성립하지 않습니다 |
| 모든 `AD-*` 통합 테스트 통과 | **충족** | AD-001·002·003~005·006·007/008·012·013 테스트 파일 존재, 전부 통과. AD-009는 외부 링크·AD-010/011은 ASM-007로 범위 제외가 명시됨 |
| 마감 상태에서 신청 차단 테스트 통과 | **충족** | `bz-business-rules.test.ts`·`fm-001/002`·e2e 모두 409 확인(경합 단서는 R-5) |
| 같은 idempotency key 재전송 시 1건만 저장 | **충족** | 재전송·동시 전송 양쪽 테스트 존재, 통과 |
| 중복 제출(idempotency) 테스트 통과 | **충족** | 같은 키 1건 / 다른 키 재신청 2건 저장이 모두 검증됨 |
| 관리자 전 경로 권한 없는 요청 차단 | **충족** | 구현 33 오퍼레이션 = 테스트 33 오퍼레이션, 각각 비로그인 401 / 회원 세션 403. (Server Action은 코드 확인만 — R-11) |
| 로그·에러 응답에 개인정보 없음 | **충족** | `pii-safety.test.ts` 통과. 관리자 검색 키워드가 URL에 남는 건은 로그·응답이 아니라 주소라 별건(R-3) |
| 신규 앱 코드에 레거시 PHP 호출 0건 | **충족** | 전용 테스트가 호출 패턴 기준으로 검사, 0건 |
| 실제 알림 업체 어댑터 + 스테이징 발송 확인 | **해당 없음(정직하게 보고됨)** | D4에서 문자 발송 없음·메일 업체 미정으로 확정돼 Gate의 단서 조항("D4 결정 후, 알림이 필요한 기능이 확정된 경우에만")에 걸립니다. `phase-4-be-notes.md` 5장이 미검증 사실과 이유(D4·D7 DNS 권한)를 명시했습니다 |
| CSV 다운로드·개인정보 조회 기록 테스트 통과 | **충족** | `ad-013-privacy.test.ts`가 원문 조회·CSV·파기 시각 설정·파기 실행·보존 설정 변경 5종 감사기록을 검증, 통과 |

→ B-1 때문에 **FAIL**입니다. 나머지 Gate 항목은 실제로 충족돼 있습니다.

---

## 관찰 (Observations)

1. **노트의 정직성은 높습니다.** `phase-4-be-notes.md` 5장은 알림 미검증, 인스턴스 단위 rate limit,
   스케줄러 부재, `automaticPurgeEnabled` 무동작, 업로드 미구현을 스스로 공개했고, 8.3장은 자기들이
   찾은 버그(보존 설정 기본 행 생성 경합 → 500)와 그 수정까지 적었습니다. 8.2장의 openapi 보완 요청도
   실제로 반영돼 있습니다. `phase-3-fe-notes.md`의 레거시 차이 22건 분류와 Gate 자가 점검도 과장이
   없었습니다. 이번 리뷰의 차단 2건은 **노트가 숨긴 것이 아니라, 노트가 "조정자가 해 달라"고 넘긴 일이
   끝나지 않은 것**(B-2)과 **노트도 통합 테스트도 실사용 경로를 보지 않아 놓친 것**(B-1)입니다.
2. **테스트가 "쓰이지 않는 경로"를 검증하는 패턴에 주의가 필요합니다.** B-1은 Route Handler 단위
   통합 테스트만으로 Gate를 판정할 때 생기는 사각지대입니다. 공개 화면이 Server Action을 쓰고 Route
   Handler는 외부용으로 남긴 구조(MIGRATION_PLAN 5장)이기 때문에, **표시·동의 문구처럼 화면에서만
   의미가 있는 계약은 반드시 E2E나 컴포넌트 단언으로 덮어야** 합니다. Phase 5 계획에 이 구분을
   넣어 두는 것을 권합니다.
3. **프로젝트 규칙 자체에 대한 의견 — ASM 번호 체계.** 지금은 담당자별로 번호 블록(040~, 070~)을
   나눠 쓰고 조정자가 수동으로 등록부에 옮기는 구조라, 이번처럼 한 단계만 빠지면 28건이 통째로
   누락됩니다. `grep -rhoE "ASM-[0-9]+"` 결과와 등록부를 비교하는 단위 테스트(또는 CI 스크립트) 한 개를
   두면 구조적으로 막을 수 있습니다. 같은 방식으로 "증거 ID(`EV-xxxx`)가 ledger에 있는지"도 자동화할
   수 있습니다.
4. **공개 예약 조회의 본인 확인 강도.** 이름 + 휴대폰만으로 타인의 신청 내역(강좌명·설명회명·신청일)을
   볼 수 있습니다. 레거시 관찰값(EV-0008)에 충실한 설계이고 결과에서 개인정보를 추가로 노출하지는
   않지만, 미성년자 관련 기록이라 Phase 6 보안 점검에서 **인증번호 문자 또는 조회 경로 전용 낮은
   rate limit** 중 하나를 검토할 가치가 있습니다(R-6와 연결).
5. **공개 `/login`이 관리자 세션도 발급합니다.** `src/lib/actions/account.ts:72-87`과
   `app/api/auth/login/route.ts:21`은 계정 역할이 ADMIN이면 공개 로그인 화면에서도 ADMIN 쿠키를
   내보냅니다. 자격 증명 검증은 동일하므로 권한 상승은 아니지만, `/admin/login`의 역할 검사
   (`adminLoginAction`의 `"관리자 계정이 아닙니다."`)가 실질적으로 의미를 갖지 않습니다. 관리자 로그인을
   별 화면으로 둔 의도(로그인 흔적 분리·정책 차등)가 있다면 공개 로그인은 MEMBER 범위만 발급하도록
   정리하는 쪽이 일관됩니다.
6. **`/sub/abouttch3`은 페이지 본문 전체가 추론입니다.** 레거시에는 로고와 공통 배경만 있었고
   (EV-0012), 홈의 `문해력 진단 신청` 카드가 이 경로를 가리킨 사실에서 "문해력 진단 안내"로 구성했습니다
   (ASM-043). 홈 관찰 문구를 재사용했고 신청은 외부 Google Forms 링크를 그대로 쓰므로 판단 자체는
   타당합니다. 다만 Phase 5 레거시 비교에서 이 페이지는 `OBSERVED` 비교 대상이 아니라는 점을
   `legacy-parity-report.md`에 미리 못 박아 두는 게 좋습니다. 같은 성격으로 `/sub/abouttch2`(분당점
   강사진, 이미지 alt로 뒷받침됨)과 시설안내 분당점 카드(ASM-081, 본문 비움)가 있습니다.
7. **`legacy-assets-raw/`·`legacy-assets-clean/`이 작업 트리에 남아 있습니다.** `.gitignore` 처리는
   되어 있어 커밋되지 않지만(확인함), Phase 종료 시 정리 여부를 정해 두면 좋겠습니다.

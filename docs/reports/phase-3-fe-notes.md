# Phase 3 FE 작업 노트

작업 위치: 워크트리 `../munsayu-v2-fe`, 브랜치 `feat/frontend`

이 문서는 두 번의 작업을 합쳐 적는다.

| 회차               | 범위                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| **1차** (2~7장)    | 공개 페이지, 회원 화면, 신청·예약 화면, 레거시 URL 호환, 메타데이터. 서버는 스텁.                |
| **2차** (9장 이후) | 관리자 화면, 스텁 → 실제 서비스·Server Action 교체, 시각 회귀 테스트, 잡정리, 레거시 이미지 연결 |

1차 작업 당시의 기록은 그대로 두되, 2차에서 바뀐 부분은 각 장에 **\[2차에서 변경\]** 로 표시했다.

---

## 1. 구현한 기능 ID와 파일

| 기능 ID | 화면                        | 경로                                                                                    | 주요 파일                                                                                                         |
| ------- | --------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PG-001  | 홈                          | `/`                                                                                     | `app/(public)/page.tsx`(2차에 이동), `src/components/home/hero.tsx`, `curriculum.tsx`, `cosmo.tsx`, `contact.tsx` |
| PG-002  | 학원 소개                   | `/sub/about`                                                                            | `app/(public)/sub/about/page.tsx`, `src/components/public/about-intro.tsx`                                        |
| PG-003  | 오시는 길                   | `/sub/Location`                                                                         | `app/(public)/sub/Location/page.tsx`, `src/components/public/location-panel.tsx`                                  |
| PG-004  | 시설안내                    | `/sub/Facility`                                                                         | `app/(public)/sub/Facility/page.tsx`, `src/components/public/facility-panel.tsx`                                  |
| PG-005  | 강사진 안내                 | `/sub/abouttch1`                                                                        | `app/(public)/sub/abouttch1/page.tsx`, `src/components/public/instructor-list.tsx`                                |
| PG-006  | 분당점 강사진               | `/sub/abouttch2`                                                                        | `app/(public)/sub/abouttch2/page.tsx`                                                                             |
| PG-007  | 문해력 진단 안내            | `/sub/abouttch3`                                                                        | `app/(public)/sub/abouttch3/page.tsx`, `src/components/public/diagnosis-section.tsx`                              |
| PG-008  | 대치본원 시간표             | `/sub/schedule.n`                                                                       | `app/(public)/sub/schedule.n/page.tsx`, `src/components/public/timetable.tsx`                                     |
| PG-009  | 분당점 시간표               | `/sub/schedule.g`                                                                       | `app/(public)/sub/schedule.g/page.tsx`, `src/components/public/timetable.tsx`                                     |
| FM-001  | 수강 예약 신청 모달         | 시간표 화면                                                                             | `src/components/public/course-reservation-dialog.tsx`                                                             |
| PG-010  | 현장설명회 예약             | `/sub/Presentation`                                                                     | `app/(public)/sub/Presentation/page.tsx`, `src/components/public/event-list.tsx`                                  |
| FM-002  | 설명회 예약 신청 모달       | 설명회 화면                                                                             | `src/components/public/event-reservation-dialog.tsx`, `src/lib/event-consent.ts`                                  |
| PG-011  | 예약 확인 / 취소            | `/sub/Check`                                                                            | `app/(public)/sub/Check/page.tsx`, `src/components/public/reservation-lookup.tsx`                                 |
| PG-012  | 공지 목록·상세              | `/notice`, `/notice/{id}`                                                               | `app/(public)/notice/page.tsx`, `app/(public)/notice/[id]/page.tsx`                                               |
| PG-013  | 로그인                      | `/login`                                                                                | `app/(public)/login/page.tsx`, `src/components/account/login-form.tsx`                                            |
| PG-014  | 회원가입                    | `/register`                                                                             | `app/(public)/register/page.tsx`, `src/components/account/register-flow.tsx`                                      |
| FM-003  | 계정 찾기·재설정·수정·탈퇴  | `/account/recovery`, `/account/password-reset`, `/account/profile`, `/account/withdraw` | `src/components/account/recovery-forms.tsx`, `password-reset-form.tsx`, `profile-forms.tsx`, `withdraw-form.tsx`  |
| RT-001  | 공지 게시판 URL 308         | `/bbs/board.php?...`                                                                    | `middleware.ts`                                                                                                   |
| RT-002  | 인증 URL 308                | `/bbs/login.php`, `/bbs/register.php`, `/bbs/password_lost.php`                         | `middleware.ts`                                                                                                   |
| RT-003  | 문해력 진단 외부 링크 유지  | 푸터·진단 안내                                                                          | `src/lib/site-config.ts`, `src/components/layout/site-footer.tsx`                                                 |
| RT-004  | `/uAdmin/**`, `/adm/**` 410 | —                                                                                       | `middleware.ts`                                                                                                   |

> **\[2차에서 변경\]** `middleware.ts` 는 `proxy.ts` 로 이름이 바뀌었다(14.1).
> 홈은 `app/page.tsx` → `app/(public)/page.tsx` 로 옮겼다(주소는 `/` 그대로, 14.4).

공통 레이아웃: `app/layout.tsx`, `app/(public)/layout.tsx`, `src/components/layout/site-header.tsx`, `site-footer.tsx`
공통 UI: `src/components/ui/` (`page-banner`, `section`, `tabs`, `campus-link-tabs`, `modal-dialog`, `disclosure`, `form-controls`)
공통 유틸: `src/lib/site-config.ts`, `metadata.ts`, `form-errors.ts`, `idempotency.ts`, `event-consent.ts`
스텁: `src/lib/data/stubs.ts`

---

## 2. 각 화면이 근거로 삼은 증거 파일

| 화면              | 증거 파일                                                                  | 가져온 것                                                                                                                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 공통 헤더         | `phase1-home.yml` 외 모든 스냅샷                                           | 상단 바 `상담센터 : (대치)02-563-5972 / (분당)031-713-5972`, 로그인·회원가입 링크, 메뉴 5개 이름과 순서                                                                                                                                          |
| 공통 푸터         | `phase1-about.yml` (전체 푸터가 펼쳐진 유일한 스냅샷)                      | 소개 문구 2줄, 지점 전화, 상담시간, ABOUT/PROGRAM/RESERVE/SNS 묶음과 링크 주소, 지점 주소, 대표·개인정보관리책임자·사업자번호·저작권 문구                                                                                                        |
| PG-001 홈         | `phase1-home.yml`, `phase1-home-1440.png`                                  | 히어로 머리글·제목·본문·버튼 2개와 링크 주소, 바로가기 카드 4개, 5단계 학습 6칸, 교육과정 6칸, LEARNING SYSTEM 3칸, PROJECT COSMO 전체(통계 4개·학습 흐름 4단계·3교시·반 편성·진단평가 표·교재 2개), 상담 문구와 상담 가능시간, 설명회 섹션 문구 |
| PG-002 학원 소개  | `phase1-about.yml`                                                         | 배너 문구, 탭 3개 이름, 1번 탭 본문 전체(문해와 사유의 생각 / 어휘와 독서 / 우리가 바라보는 문해력 / 언어의 바탕 / 약속 / 상담 안내)                                                                                                             |
| PG-003 오시는 길  | `phase1-location.yml`                                                      | 배너 문구, 지점 탭, 대치 주소·역세권 배지·지도 링크 3개, 주소/도보/상담전화 카드, 지하철 2개 노선 안내, 버스 정류장 표 3행                                                                                                                       |
| PG-004 시설안내   | `phase1-facility.yml`                                                      | 배너 문구, 지점 탭, 대치 소개 문구, 슬라이드 제목, 공간 카드 4개(ATMOSPHERE/PERSPECTIVE/CLASSROOM/FLOW OF MOVEMENT), 상담 카드                                                                                                                   |
| PG-005 강사진     | `phase1-teachers.yml`, `legacy-instructors.json`                           | 배너 문구, `PRO 강사진` 머리글, 강사 13명의 소속·이름·약력 전체                                                                                                                                                                                  |
| PG-008/009 시간표 | `phase1-course.yml`, `phase1-schedule-g.yml`, `phase1-schedule-g-1440.png` | 배너 문구(지점별로 다름), 지점 링크 탭, 학년 묶음 3개, 강좌 카드 12개(머리글·강좌명·강의시간·개강일·상세보기·수강예약), 카드 레이아웃과 색                                                                                                       |
| FM-001            | `phase1-course-reservation-dialog.yml`, `phase1-course-form-contract.json` | 제목 `<지점> 수강 예약 신청`, 선택 강좌 정보 3줄, 입력란 3개와 안내 문구, 라디오 2묶음, 동의 안내 3항목, 필수 체크박스, 제출 버튼 문구                                                                                                           |
| PG-010 설명회     | `phase1-presentation.yml`                                                  | 배너 문구, `설명회 일정 확인 및 예약` 제목과 본문, 설명회 카드 10건(상태 표시·제목·일시·장소·상세보기·비활성 접수마감 버튼)                                                                                                                      |
| PG-011 예약 확인  | `phase1-check.yml`                                                         | 배너 문구, `예약 정보 입력 인증` 제목, 입력란 2개 이름과 안내 문구, 조회 버튼 문구, 주의사항 5개 원문                                                                                                                                            |
| PG-012 공지       | `phase1-notice.yml`                                                        | 배너 문구, Total 표시, 표 머리글 4개, 공지 2건(공지 배지·제목·작성자·날짜), 상세 URL 형식                                                                                                                                                        |
| PG-013 로그인     | `phase1-login.yml`                                                         | `회원 로그인` 제목, 회원가입 링크, 입력란 안내 문구 2개, 로그인 버튼, `로그인 상태 유지` 체크박스, 아이디/비밀번호 찾기 링크                                                                                                                     |
| PG-014 회원가입   | `phase1-register.yml`                                                      | 배너 문구, 안내 문구, `(필수) 회원가입약관` 상자 내용, 개인정보 표 2행, 체크박스 문구 3개, 취소하기·다음 버튼                                                                                                                                    |

---

## 3. 레거시와 의도적으로 다르게 만든 부분

| #   | 레거시                                                               | 신규                                                                                                                                          | 이유                                                                                                             |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 홈 히어로 제목이 `h2`, 홈에 `h1` 없음                                | 히어로 제목을 `h1`                                                                                                                            | Phase 3 Gate 접근성(제목 순서). ASM-046                                                                          |
| 2   | 홈 하단에 `설명회 알림 신청` 폼(학년·학생 이름·학교명·보호자 연락처) | 같은 문구 + 설명회 화면 링크                                                                                                                  | 그 폼은 Phase 2 계약(FM-002)에 없고 개인정보 동의 절차도 없다. ASM-047                                           |
| 3   | 설명회 신청 폼                                                       | 신규 설계(이름·연락처·학년·참석 인원 1~2·필수 동의)                                                                                           | 레거시 폼 미관찰, D9·`eventReservationSchema` 기준 신규 설계                                                     |
| 4   | 강사 사진, 시설 사진 슬라이드, 배너 사진, 로고 이미지                | ~~이미지 없이 글·CSS로 구성~~ → **\[2차에서 해소\]** 실제 레거시 이미지를 붙였다 (13장)                                                       | 1차에는 레거시 이미지 파일을 확보하지 못했다(ASM-042). 2차에서 조정자가 권리 확인 후 파일을 배치해 주어 연결했다 |
| 5   | 오시는 길의 지도 iframe                                              | 네이버·카카오·구글 지도 링크만                                                                                                                | 외부 요청을 만들지 않기 위해. ASM-050                                                                            |
| 6   | 강사 카드 위 마우스를 올리면 나타나는 `수강 예약하기` 버튼           | 항상 보이는 링크                                                                                                                              | 키보드로도 쓸 수 있어야 한다. ASM-051                                                                            |
| 7   | `상세보기` 버튼이 별도 화면·모달로 추정                              | 카드 안에서 펼쳐지는 영역                                                                                                                     | 레거시 상세 내용을 관찰하지 못했다. ASM-044                                                                      |
| 8   | 공지 목록의 `검색` 버튼                                              | 넣지 않음                                                                                                                                     | 검색 계약이 없다. ASM-054                                                                                        |
| 9   | 대치 4학년 주중반 개강일 표기 `11월 17월(화)`                        | `11월 17일(화)`                                                                                                                               | 레거시 데이터 오타. 스텁 값이고 DB 연결 시 사라진다                                                              |
| 10  | 강사 목록 마지막의 `등록된 프로필 정보가 없습니다.` 빈 카드          | 넣지 않음                                                                                                                                     | 내용이 없는 레코드                                                                                               |
| 11  | 강사진 배너 문구 `이미지에 마우스를 올리시면…`                       | `강사 카드에서 바로 수강 예약 화면으로 이동할 수 있습니다.`                                                                                   | 이미지·호버를 쓰지 않으므로 문구가 맞지 않는다                                                                   |
| 12  | Zod 기본 영어 오류 문구가 그대로 보일 수 있음                        | ~~같은 뜻의 한국어로 바꿔 표시~~ → **\[2차에서 해소\]** 공유 계약이 전역 한국어 문구를 설정해(`src/lib/contracts/locale.ts`) FE 변환을 지웠다 | 계약이 문구를 가지면 서버 응답과 화면 문구가 같아진다. ASM-058                                                   |

---

## 4. 확인한 Next.js 16 API와 확인 방법

Next DevTools MCP·Context7 이 없어 설치된 패키지의 타입 정의를 직접 읽어 확인했다.

| 항목                             | 확인 결과                                                                    | 확인한 파일                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 동적 세그먼트 `params`           | `Promise<ParamMap[Route]>` — `await` 해야 한다                               | `.next/types/validator.ts` (`AppPageConfig`)                                    |
| `generateMetadata` 시그니처      | `(props: { params: Promise<…> }, parent: ResolvingMetadata)`                 | `.next/types/validator.ts`                                                      |
| `generateStaticParams`           | `(props: { params: ParamMap[Route] }) => any[] \| Promise<any[]>`            | `.next/types/validator.ts`                                                      |
| Route Handler 시그니처           | `(request: NextRequest, context: { params: Promise<…> })`                    | `.next/types/validator.ts` (이번 범위에서는 Route Handler 를 쓰지 않음)         |
| 타입 안전 라우트                 | 켜져 있고 `Link href` 가 실제 경로로 검사된다                                | `.next/types/routes.d.ts`                                                       |
| `redirect` / `permanentRedirect` | 둘 다 있고 Route Handler 에서 각각 307/308                                   | `node_modules/next/dist/client/components/redirect.d.ts`                        |
| middleware 타입                  | `NextMiddleware` 는 `@deprecated`, `NextProxy` 로 이름이 바뀜                | `node_modules/next/dist/server/web/types.d.ts`                                  |
| middleware 파일 이름             | `middleware` 와 `proxy` 둘 다 인식 (`MIDDLEWARE_FILENAME`, `PROXY_FILENAME`) | `node_modules/next/dist/lib/constants.js`                                       |
| `config.matcher` 형식            | `string \| Array<string \| {source, has, missing, locale}>`                  | `node_modules/next/dist/build/segment-config/middleware/middleware-config.d.ts` |
| `NextResponse` / `NextRequest`   | `next/server` 에서 export                                                    | `node_modules/next/server.d.ts`                                                 |
| Zod 4 오류 처리                  | `z.flattenError` 존재, `$ZodIssue` 는 `code` 로 구분되는 union               | `node_modules/zod/v4/core/errors.d.cts`                                         |

`cacheComponents: true` 환경에서 `useSearchParams` 를 쓰는 비밀번호 재설정 폼만 `Suspense` 경계가 필요했고, 나머지 화면은 스텁 데이터를 동기 함수로 읽어 정적으로 미리 만들어진다(`npm run build` 결과에서 모든 경로가 `○ Static`, `/notice/[id]` 만 `◐ PPR`).

---

## 5. 남은 STUB 목록 — **\[2차에서 전부 해소\]**

> 2차 작업에서 `src/lib/data/stubs.ts` 를 삭제했고 `grep -rn "STUB" app src` 결과는 0건이다.
> 무엇을 무엇으로 바꿨는지는 10장에 있다. 아래는 1차 작업 당시의 기록이다.

`grep -rn "STUB" src app` 결과는 모두 `src/lib/data/stubs.ts` 한 파일 안에 있다 (총 37줄, 설명 주석 포함).

읽기 스텁

| 함수                                                    | 바꿀 대상                                                              |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `listCoursesByCampusStub`                               | `src/server/services/courses` 시간표 조회 / `GET /api/courses?campus=` |
| `listEventsByCampusStub`                                | `src/server/services/events` 공개 설명회 목록 / `GET /api/events`      |
| `listNoticesStub`, `findNoticeStub`, `countNoticesStub` | 공지 조회 / `GET /api/notices`, `GET /api/notices/{id}`                |
| `listInstructorsStub`, `listBundangInstructorsStub`     | `src/server/services/instructors` / `GET /api/instructors`             |
| `getSessionUserStub`                                    | `src/server/auth` 세션 조회                                            |

쓰기 스텁

| 함수                          | 바꿀 대상                               |
| ----------------------------- | --------------------------------------- |
| `submitCourseApplicationStub` | `POST /api/course-applications`         |
| `submitEventReservationStub`  | `POST /api/event-reservations`          |
| `lookupReservationsStub`      | `POST /api/reservations/lookup`         |
| `cancelReservationStub`       | `POST /api/reservations/{id}/cancel`    |
| `registerMemberStub`          | `POST /api/auth/register`               |
| `loginStub`                   | `POST /api/auth/login`                  |
| `findLoginIdStub`             | `POST /api/auth/find-login-id`          |
| `requestPasswordResetStub`    | `POST /api/auth/password-reset/request` |
| `resetPasswordStub`           | `POST /api/auth/password-reset/confirm` |
| `updateProfileStub`           | `PATCH /api/account/profile`            |
| `changePasswordStub`          | `POST /api/account/password`            |
| `withdrawStub`                | `POST /api/account/withdraw`            |

콘텐츠 스텁(값 자체도 교체 대상): `COURSE_STUBS`, `EVENT_STUBS`, `NOTICE_STUBS`, `INSTRUCTOR_STUBS`.

폼 검증은 스텁이 아니다. 모든 폼이 공유 계약의 Zod 스키마로 실제 검증하고 필드별 오류를 화면에 띄운다. 네트워크 호출만 스텁이다.

---

## 6. 새 ASM 후보 (조정자가 `docs/reports/open-questions.md` 로 옮길 것)

| 번호    | 무엇을 가정했나                                                                                   | 왜                                                                                                         | 어디에 반영했나                                                                             | 바꾸는 방법                                              | 원장님께 물을 질문                                                                    |
| ------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| ASM-040 | 주 메뉴 5개의 하위 항목을 관찰된 공개 경로로 채웠다                                               | 레거시 메뉴 링크가 `javascript:;` 드롭다운이라 하위 항목을 관찰할 수 없었다                                | `src/lib/site-config.ts` `MAIN_NAV`                                                         | 실제 메뉴 구성을 받으면 배열만 고친다                    | 상단 메뉴를 눌렀을 때 나오는 하위 항목이 각각 무엇인가요?                             |
| ASM-041 | 글꼴은 시스템 글꼴 묶음만 쓴다(Apple SD Gothic Neo → Noto Sans KR → Malgun Gothic 순)             | 레거시 글꼴 라이선스 미확인(D6, ASM-011). 웹폰트 파일을 저장소에 넣지 않는다                               | `app/globals.css` `--font-sans`                                                             | 라이선스 확인된 글꼴로 교체하거나 `next/font` 사용       | 현재 쓰는 글꼴의 사용 권한을 확인할 수 있나요?                                        |
| ASM-042 | 레거시 이미지(로고·강사 사진·시설 사진·배너 사진) 없이 글·CSS로만 구현한다                        | 이미지 권리는 학원 귀속으로 확정됐지만(D6) **실제 파일을 확보하지 못했고** 운영 사이트에서 내려받지 않는다 | `src/components/ui/page-banner.tsx`, `instructor-list.tsx`, `facility-panel.tsx`, 헤더 로고 | 원본 이미지를 받으면 `next/image` 로 교체                | 홈페이지에 쓰던 로고·강사 사진·시설 사진 원본 파일을 주실 수 있나요?                  |
| ASM-043 | `/sub/abouttch2` 는 분당점 강사진, `/sub/abouttch3` 는 문해력 진단 안내로 만든다                  | 두 경로의 내용을 관찰하지 못했다. abouttch3 은 홈의 `문해력 진단 신청` 카드가 가리키던 주소다              | `app/(public)/sub/abouttch2/page.tsx`, `abouttch3/page.tsx`                                 | 실제 내용을 받으면 페이지 본문만 바꾼다                  | `/sub/abouttch2`, `/sub/abouttch3` 페이지는 각각 어떤 내용인가요?                     |
| ASM-044 | 강좌·설명회의 `상세보기`는 카드 안에서 펼쳐지는 요약으로 만든다                                   | 레거시 상세 내용을 관찰하지 못했다                                                                         | `src/components/public/timetable.tsx`, `event-list.tsx`                                     | 상세 항목이 정해지면 펼침 영역 내용을 늘린다             | 강좌·설명회 `상세보기`에는 어떤 내용이 나오나요?                                      |
| ASM-045 | 설명회 목록에 `접수중`·`마감임박` 예시 일정을 임시로 넣었다                                       | 레거시 관찰 시점에 접수 가능한 일정이 없어 신청 폼을 열 수 없다                                            | `src/lib/data/stubs.ts` `EVENT_STUBS`                                                       | BE 연결 시 전부 사라진다                                 | (원장님께 물을 것 없음 — 개발용 임시 값)                                              |
| ASM-046 | 홈 히어로 제목을 `h1`으로 올린다                                                                  | 레거시 홈에는 `h1`이 없어 제목 순서가 맞지 않는다                                                          | `src/components/home/hero.tsx`                                                              | 레거시와 똑같이 맞추려면 `h2`로 되돌린다                 | (원장님께 물을 것 없음 — 접근성 기준)                                                 |
| ASM-047 | 홈 하단 `설명회 알림 신청` 폼을 없애고 설명회 화면 링크로 바꾼다                                  | 그 폼은 Phase 2 계약에 없고 동의 절차 없이 개인정보를 받는다                                               | `src/components/home/contact.tsx`                                                           | 홈에서도 신청을 받으려면 FM-002 계약을 홈에 다시 붙인다  | 홈 화면에서도 설명회 알림 신청을 바로 받아야 하나요?                                  |
| ASM-048 | 학원 소개 2·3번 탭은 홈에서 관찰한 PROJECT COSMO·진단평가 내용을 쓴다                             | 레거시 2·3번 탭 본문을 관찰하지 못했다                                                                     | `app/(public)/sub/about/page.tsx`                                                           | 실제 본문을 받으면 탭 패널만 바꾼다                      | 학원 소개 2·3번 탭에는 어떤 내용이 들어가나요?                                        |
| ASM-049 | 오시는 길·시설안내의 분당점 탭은 공개된 주소·전화만 보여 준다                                     | 레거시 분당점 탭이 접혀 있어 관찰하지 못했다                                                               | `src/components/public/location-panel.tsx`, `facility-panel.tsx`                            | 분당점 교통·시설 내용을 받으면 채운다                    | 분당점 오시는 길·시설 안내에 넣을 내용을 주실 수 있나요?                              |
| ASM-050 | 지도는 iframe 대신 네이버·카카오·구글 지도 링크만 제공한다                                        | 지도 iframe 은 외부 요청을 만들고 지도 서비스 키가 필요하다                                                | `src/components/public/location-panel.tsx`                                                  | 지도 서비스를 정하면 임베드로 바꾼다                     | 홈페이지에 지도를 직접 띄우길 원하시나요?                                             |
| ASM-051 | 강사 카드의 `수강 예약하기`는 항상 보이는 링크로 두고 대치 시간표로 보낸다                        | 레거시는 사진 위 마우스를 올려야 나타나 키보드로 쓸 수 없다                                                | `src/components/public/instructor-list.tsx`                                                 | 강사별 강좌가 생기면 해당 강좌로 보낸다                  | 강사별로 담당 강좌를 연결해야 하나요?                                                 |
| ASM-052 | 설명회 동의 문구는 강좌 동의 문구를 바탕으로 목적·수집항목·보유기간만 바꿨다                      | 레거시 설명회 폼 미관찰, 공유 계약에 설명회용 상수 없음 (ASM-009 기준 적용)                                | `src/lib/event-consent.ts`                                                                  | 조정자가 계약으로 옮기거나 문구를 고친다                 | 설명회 신청 때 보여 줄 개인정보 안내 문구를 확인해 주실 수 있나요?                    |
| ASM-053 | 예약 확인 화면의 주의사항 5개를 레거시 문구 그대로 둔다                                           | 운영 안내 문구라 임의로 고치지 않는다                                                                      | `app/(public)/sub/Check/page.tsx`                                                           | 문구를 받아 수정한다                                     | 문자·알림톡을 보내지 않기로 했는데(D4), `안내 문자 발송 트랙` 문구는 어떻게 바꿀까요? |
| ASM-054 | 공지 목록의 검색 기능을 넣지 않는다                                                               | 검색 계약이 없다                                                                                           | `app/(public)/notice/page.tsx`                                                              | 검색 계약이 생기면 추가한다                              | 공지사항 검색이 꼭 필요하신가요?                                                      |
| ASM-055 | 회원가입 2단계와 정보 수정 화면은 계약 스키마만 따른다                                            | 레거시 2단계·정보 수정 화면을 관찰하지 못했다(제출·동의 클릭 금지)                                         | `src/components/account/register-flow.tsx`, `profile-forms.tsx`                             | 실제 항목을 받으면 계약과 함께 바꾼다                    | 회원가입 때 추가로 받는 항목이 있나요?                                                |
| ASM-056 | 회원가입 약관 상자에 레거시 문구(`해당 홈페이지에 맞는 회원가입약관을 입력합니다.`)를 그대로 둔다 | 레거시에 실제 약관이 들어 있지 않았다                                                                      | `src/components/account/register-flow.tsx`                                                  | 실제 약관 본문을 받아 넣는다                             | 회원가입 약관 전문을 주실 수 있나요?                                                  |
| ASM-057 | `/bbs/**` 중 매핑에 없는 주소는 404로 둔다                                                        | `route-compatibility-map.json` 에 공지·인증 외의 게시판이 없다                                             | `middleware.ts`                                                                             | 다른 게시판이 있으면 매핑에 추가한다                     | 공지 말고 쓰시던 게시판이 더 있나요?                                                  |
| ASM-058 | Zod 기본 영어 오류 문구를 화면에서 한국어로 바꿔 보여 준다                                        | 공유 계약의 일부 스키마(`personNameSchema` 등)에 한국어 문구가 없다                                        | `src/lib/form-errors.ts`                                                                    | 계약에 한국어 문구를 넣으면 이 변환이 자동으로 비켜 간다 | (원장님께 물을 것 없음 — 화면 문구 처리)                                              |

---

## 7. 조정자에게 요청

1. **`src/lib/contracts/common.ts` 문구 보강 제안.** `personNameSchema`, `schoolName`(`courseApplicationSchema`), `loginIdSchema` 등 일부 스키마에 한국어 오류 문구가 없어 Zod 기본 영어 문구가 나온다. 지금은 FE에서 한국어로 바꿔 표시하지만(ASM-058), 계약에 문구를 넣는 쪽이 FE·BE 응답이 같아진다. 계약 변경이라 FE가 손대지 않았다.
2. **브랜치가 `feat/phase-3-4` 보다 3커밋 뒤에 있다.** 작업 중 조정자가 `5c7beaa`(openapi 44경로 기록, 관리자 계약 보강), `568dec2`(410 규칙에 RT-004 부여), `a80ecbf`(migration-status 뼈대)를 올렸다. 확인 결과 공개 화면이 쓰는 계약(`common`·`applications`·`reservations`·`auth`)은 바뀌지 않았고, 새로 생긴 `POST /api/account/password` 와 RT-004 는 이 작업에 반영했다. 병합 시 충돌은 없을 것으로 보인다.
3. **`src/lib/event-consent.ts` 이동 여부.** 설명회 동의 문구 상수를 FE 쪽에 두었다(ASM-052). BE도 저장 시 같은 문구·`policyVersion` 이 필요하면 `src/lib/contracts/applications.ts` 로 옮겨 주시기 바란다.
4. ~~**`middleware.ts` → `proxy.ts` 이름 변경.**~~ → **2차에서 처리 완료**(14.1). Next.js 16.4.5 빌드가 `middleware` 파일 규칙을 deprecated 로 경고한다(`npx @next/codemod@canary middleware-to-proxy .`). 지시가 `middleware.ts` 였고 소유권 표에도 `middleware.ts` 로 적혀 있어 그대로 두었다. 이름을 바꾸려면 소유권 표도 함께 고쳐야 한다.
5. **`src/lib/site.ts` 와 `tests/unit/site.test.ts` 정리.** → 2차에서 `src/lib/site.ts` 만 지웠다. 테스트 파일은 조정자 소유라 남아 있고 지금 빌드를 막고 있다(17장 1번). Phase 0 하네스 상수를 확인하는 테스트라 기능과 무관하다. `tests/` 가 조정자 소유여서 지우지 않고 `src/lib/site.ts` 를 남겨 두었다. 테스트를 정리할 때 함께 지우면 된다.
6. ~~**`app/favicon.ico` 교체.**~~ → **2차에서 처리 완료**. 조정자가 레거시 파비콘을 넣어 주었다. Next.js 스타터 기본 파비콘이 그대로 남아 있다. 소유권 표에 없는 파일이라 손대지 않았다. 학원 파비콘을 받으면 교체가 필요하다.
7. **`/uAdmin/` 처럼 끝에 슬래시가 붙은 주소.** Next 기본 동작이 미들웨어보다 먼저 `/uAdmin` 으로 308 하고, 그다음 410 이 나간다. 최종 상태는 410 이고 `/admin` 은 드러나지 않는다. 한 번에 410 으로 보내려면 `next.config.ts` 에 `skipTrailingSlashRedirect: true` 가 필요한데 조정자 소유 파일이라 바꾸지 않았다.

---

## 8. 실행한 명령과 결과

| 명령                                              | 결과                                                     |
| ------------------------------------------------- | -------------------------------------------------------- |
| `npx tsc --noEmit`                                | 통과 (오류 0)                                            |
| `npm run lint`                                    | 통과 (오류 0, 경고 0)                                    |
| `npx prettier --check app src middleware.ts`      | 통과                                                     |
| `npm run build`                                   | 성공. 22개 경로 생성, `/notice/[id]` 만 PPR, 나머지 정적 |
| `npx vitest run --project unit`                   | 1 파일 / 1 테스트 통과                                   |
| `npm run dev -- --hostname 127.0.0.1 --port 3100` | 기동 확인                                                |

로컬 개발 서버(127.0.0.1:3100)에서 확인한 것

- 공개·회원 화면 20개 경로 모두 200
- `/bbs/board.php?bo_table=notice` → 308 `/notice`, `?...&wr_id=2` → 308 `/notice/2`
- `/bbs/login.php` → 308 `/login`, `/bbs/register.php` → 308 `/register`, `/bbs/password_lost.php` → 308 `/account/recovery`
- `/uAdmin/index.php`, `/adm`, `/adm/login.php` → 410, 본문은 `요청하신 주소는 더 이상 제공되지 않습니다.` 뿐이고 `/admin` 문자열 0건
- `/bbs/other.php` → 404, `/notice/999` → 404
- 메타데이터: 19개 경로 모두 title·description·canonical·OG 5개(og:title/description/url/type/site_name) 존재, 각 페이지 `h1` 정확히 1개
- 관찰된 title 일치: `/` `문해와 사유(초등독서논술학원)`, `/login` `로그인 | …`, `/register` `회원가입약관 | …`, `/notice` `공지사항 페이지 | …`, `/sub/Presentation` `문해와 사유(초등독서논술학원)`
- FM-001 모달: 라디오 미선택 시 한국어 오류 2건, 나머지 미입력 시 계약 스키마 오류 4건 표시, Escape 로 닫힘
- FM-002 모달: 계약대로 이름·연락처·학년·참석 인원(1~2명)·필수 동의 표시
- PG-011: 조회 → 목록 2건 → 건별 취소 확인 대화상자 → 취소 후 상태가 `취소됨` 으로 바뀜
- 390px 폭에서 13개 화면 모두 가로 스크롤 없음
- 폼이 있는 7개 화면에서 레이블 없는 폼 컨트롤 0건
- 운영 사이트(munsayu.com)에 보낸 요청 0건 — 모든 작업은 `docs/evidence` 와 로컬 서버만 사용

---

---

# 2차 작업 (관리자 화면 · 스텁 교체 · 시각 회귀 · 이미지 연결)

## 9. 2차에서 만든 것 요약

| 분류        | 내용                                                         | 주요 파일                                                                        |
| ----------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 관리자 화면 | AD-001~AD-008, AD-012, AD-013                                | `app/admin/**`, `src/components/admin/**`, `src/lib/actions/admin.ts`            |
| 스텁 제거   | 읽기는 서비스 직접 호출, 쓰기는 Server Action                | `src/lib/data/public-content.ts`, `src/lib/actions/**`, `src/lib/view-models.ts` |
| 시각 회귀   | 1440/390 스냅샷 34장 + 반응형·접근성 단언 + 깨진 이미지 검사 | `tests/visual/**`                                                                |
| 잡정리      | `middleware.ts` → `proxy.ts`, 파비콘, `src/lib/site.ts` 삭제 | `proxy.ts`, `app/favicon.ico` 외                                                 |
| 이미지      | 레거시 이미지 33장 + 앱 아이콘 4개 연결                      | `src/lib/images.ts`, `public/images/**`                                          |

---

## 10. 스텁을 무엇으로 바꿨나 (AD 아님, 공개·회원 화면)

검증: `grep -rn "STUB" app src` → **출력 없음(0건)**. `src/lib/data/stubs.ts` 삭제됨.

### 10.1 읽기 — Server Component 에서 서비스 직접 호출

HTTP 왕복이 없고 타입이 그대로 이어진다. Route Handler 는 외부·프로그램 호출용 공개 API 로 남겼다.

| 화면               | 바뀐 뒤                                   | 중개 파일                               |
| ------------------ | ----------------------------------------- | --------------------------------------- |
| PG-008/009 시간표  | `listPublicCourses({campusId})`           | `loadTimetable()`                       |
| PG-010 설명회      | `listPublicEvents({})` + `listCampuses()` | `loadEventGroups()`                     |
| PG-005 강사진      | `listInstructors()`                       | `loadInstructors()`                     |
| PG-006 분당 강사진 | `listInstructors()` → 팀 이름 `분당` 필터 | `loadBundangInstructors()`              |
| PG-012 공지 목록   | `listNotices({page,pageSize})`            | 페이지에서 직접                         |
| PG-012 공지 상세   | `getNotice(id)`                           | 페이지에서 직접                         |
| 회원 세션          | `getMemberUserFromCookies()`              | `/account/profile`, `/account/withdraw` |

지점 식별자는 DB 가 만든 값이라 경로(`/sub/schedule.n`)에 박힌 값과 다르다. 화면은
`src/lib/site-config.ts` 의 **지점 이름**으로 DB 지점을 찾는다. // ASM-075

### 10.2 쓰기·조회 — Server Action

사이트 자체 폼은 Server Action, 외부 호출은 Route Handler (BLUEPRINT 2장, MIGRATION_PLAN 5장).
모든 Action 이 **서버에서 같은 계약 스키마로 다시 검증**하고, 공개 경로에는 Route Handler 와
같은 요청 횟수 제한을 건다.

| 기능                                    | Server Action                                                              | 호출하는 서비스                                                       |
| --------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| FM-001 강좌 신청                        | `submitCourseApplicationAction`                                            | `createCourseApplication`                                             |
| FM-002 설명회 예약                      | `submitEventReservationAction`                                             | `createEventReservation`                                              |
| PG-011 예약 조회                        | `lookupReservationsAction`                                                 | `lookupReservations`                                                  |
| PG-011 예약 취소                        | `cancelReservationAction`                                                  | `cancelReservation`                                                   |
| FM-003 가입                             | `registerAction`                                                           | `registerMember`                                                      |
| PG-013 로그인                           | `loginAction`                                                              | `authenticate` + `issueSession` + 쿠키                                |
| AD-001 관리자 로그인                    | `adminLoginAction`                                                         | 같음(관리자 역할 아니면 쿠키 발급 안 함)                              |
| 로그아웃                                | `logoutAction`                                                             | 두 범위 세션·쿠키 삭제                                                |
| 아이디 찾기 / 비밀번호 재설정 요청·확정 | `findLoginIdAction` / `requestPasswordResetAction` / `resetPasswordAction` | `sendLoginIdByMail` / `requestPasswordReset` / `confirmPasswordReset` |
| 정보 수정 / 비밀번호 변경 / 탈퇴        | `updateProfileAction` / `changePasswordAction` / `withdrawAction`          | `updateProfile` / `changePassword` / `withdrawMember`                 |

`fetch` 로 Route Handler 를 부르는 곳은 **한 곳뿐**이다: 관리자 CSV 내려받기(`<a href>` 로
`GET /api/admin/applications/export`). 브라우저가 파일로 받아야 해서 링크가 맞다.

### 10.3 오류 문구

`src/lib/form-errors.ts` 의 한국어 변환(`toKoreanMessage`)을 **삭제**하고 `issue.message` 를
그대로 쓴다. 공유 계약이 `z.config({customError})` 로 전역 한국어 문구를 설정하므로
(`src/lib/contracts/locale.ts`) 서버 응답의 `fieldErrors` 와 화면 문구가 같아졌다.
필드별 묶기(`toFieldErrors`)와 `errorElementId` 는 폼들이 쓰고 있어 남겼다.

### 10.4 seed 자료로 다시 확인한 것

- 시간표: 학년 묶음(`gradeTitle`)으로 나뉘고 지점 필터가 맞다. 대치 6강좌 / 분당 2강좌.
- 접수마감 강좌(`5학년 비문학 독해 특강`)는 비활성 `접수마감` 버튼이고 예약 모달이 열리지 않는다.
- 설명회 상태 문구(`접수중`·`마감임박`·`접수마감`)가 그대로 보이고, 마감 건은 신청 버튼이 없다.
- 지점이 없는 설명회(`온라인 문해력 진단 안내 설명회`)는 `지점 공통 / 온라인` 묶음에 들어간다. // ASM-071
- 예약 조회: 한 연락처로 강좌·설명회를 함께 조회하고 건별 취소가 된다 (브라우저로 실제 확인).
- 공지: 고정 글은 `공지` 배지, 나머지는 번호. 없는 id 는 **404**.

---

## 11. 관리자 화면 (AD-001 ~ AD-013)

### 11.1 경로와 담당 기능

| 경로                  | 기능 ID                | 내용                                                        |
| --------------------- | ---------------------- | ----------------------------------------------------------- |
| `/admin/login`        | AD-001                 | 관리자 전용 로그인. 가드 바깥                               |
| `/admin`              | —                      | 개요·숫자 요약·각 화면 입구                                 |
| `/admin/members`      | AD-002                 | 회원 검색(가린 값)·상태 변경·관리자 계정 추가/삭제          |
| `/admin/events`       | AD-003, AD-004, AD-005 | 설명회 목록·추가·상태 변경·상태 옵션 추가·집계 숫자         |
| `/admin/events/[id]`  | AD-003, AD-005         | 설명회 수정 + **예약 건수 / 참석 인원 합계 분리** 집계      |
| `/admin/instructors`  | AD-006                 | 강사·팀 CRUD, 팀별 노출 순서, 사진 지정                     |
| `/admin/courses`      | AD-007                 | 강좌 CRUD, 지점·접수상태 필터, 접수중/접수마감 수동 전환    |
| `/admin/applications` | AD-008 (+AD-013)       | 신청·예약 목록(마스킹), 원문 보기, CSV, 파기 대상 시각 설정 |
| `/admin/privacy`      | AD-013                 | 보존 설정, 파기 미리 세기 → 실행                            |
| `/admin/analytics`    | AD-012                 | 분석 ID **설정 여부만** 표시                                |

### 11.2 가드 구조 (지시와 다른 점 1건)

지시는 `app/admin/layout.tsx` 에 가드를 두라고 했지만, 그러면 `/admin/login` 도 가드 안에 들어가
로그인 화면에서 로그인 화면으로 되돌아가는 고리가 생긴다. 그래서 **라우트 그룹**으로 나눴다.

```
app/admin/login/page.tsx          → /admin/login      (가드 없음)
app/admin/(authed)/layout.tsx     → 가드 + 관리자 화면 틀
app/admin/(authed)/page.tsx       → /admin
app/admin/(authed)/<영역>/page.tsx → /admin/<영역>
```

- 가드는 요청마다 `getAdminUserFromCookies()` 로 쿠키 → 세션 행 → 계정 상태 → 역할을 다시 본다.
- **레이아웃만 믿지 않는다.** `src/lib/actions/admin.ts` 의 모든 Server Action 이 자기 안에서
  `requireAdminFromCookies()` 를 다시 부른다.
- 관리자 화면과 로그인 화면 모두 `robots: { index: false }` 다.

확인한 것 (로컬 서버):

| 확인                                   | 결과                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| 비로그인으로 관리자 8경로 요청         | 전부 **307 → `/admin/login`**                               |
| `member01` 로 로그인한 뒤 `/admin`     | **307 → `/admin/login`** (회원 쿠키는 관리자 쿠키가 아니다) |
| `/admin/login` 에서 `member01` 로 제출 | 쿠키 발급 없음, `관리자 계정이 아닙니다.`                   |
| `admin` 로그인 후 관리자 10경로        | 전부 200                                                    |
| 관리자 로그인 상태로 `/admin/login`    | 307 → `/admin`                                              |

### 11.3 화면별 메모

- **AD-002**: 목록은 서버가 가린 값(`maskName`/`maskEmail`/`maskPhone`)만 돌려준다. 마지막
  관리자 삭제(409)와 자기 계정 삭제(403)는 확인 대화상자 안에 미리 알리고, 서버 문구를 그대로
  띄운다. 관리자 계정 묶음은 역할 필터 계약이 없어 1페이지 100건을 읽어 `role === "ADMIN"` 으로
  추렸다. // ASM-078
- **AD-003~005**: 레거시 목록 칸 구성(EV-ADM-03)을 그대로 옮겼고 **예약 건수와 참석 인원 합계를
  다른 칸**으로 뒀다. 관리코드는 `YYYY-NNN` 형식으로 자동으로 채우고 직접 고칠 수 있다(ASM-005).
  상태는 목록에서 선택 상자로 바꾼다. 예약이 있는 설명회 삭제는 409 문구를 그대로 보여 준다.
- **AD-006**: 강사 줄마다 소속 팀과 **그 팀에서의 노출 순서**를 함께 보여 주고, 화면 위쪽에
  "지금 두 팀 이상에 속한 강사" 목록을 적어 한 강사 : 여러 팀 관계가 눈에 보이게 했다. (ASM-003)
- **AD-007**: 지점·접수상태 필터는 GET 폼(주소에 남음)이고, 접수중/접수마감은 줄 안에서 바꾼다.
  자동 마감은 없다(Q-ADM-05).
- **AD-008**: 필터는 공유 계약 `applicationFilterSchema` 그대로. 목록은 마스킹 상태이고 건별
  「원문 보기」는 **기록이 남는다는 안내를 먼저** 보여 준 뒤에만 조회한다. 대화상자를 닫으면
  원문을 화면에서 지운다.
- **AD-012**: 화면에는 `설정됨 / 설정 안 됨` 만 표시하고 **ID 값은 절대 찍지 않는다.**
  공개 화면 스크립트는 `src/components/layout/analytics-script.tsx` 가 담당하며
  `ANALYTICS_PROVIDER_ID` 가 비어 있으면 `null` 을 반환해 아무 것도 넣지 않는다.
  테스트하기 쉽도록 스크립트에 `data-analytics="provider"`, 관리자 화면 표시에
  `data-analytics-configured` 속성을 달아 뒀다.
- **AD-013**: 파기는 **미리 세기(dryRun)를 먼저** 해야 실제 실행 버튼이 열린다. 파기 대상이 0건이면
  실행 버튼이 계속 잠긴다. 모든 동작 앞에 "기록에 남습니다" 안내를 둔다.

### 11.4 접근성

- 표는 `<th scope="col">`·`<th scope="row">`, `<caption class="sr-only">`.
- 줄 안의 작은 선택 상자·숫자 입력에도 `sr-only` 레이블을 붙였다. 레이블 없는 컨트롤 0건.
- 확인 대화상자는 기존 `ModalDialog`(포커스 가둠·Escape·돌아가기 포커스 복원)를 쓴다.
- 선택만으로 저장하지 않는다. 키보드로 선택 상자를 지나갈 때 실수로 저장되지 않게 버튼을 눌러야 한다.
- 제목 순서: 화면마다 `h1` 1개(`AdminPageHeading`), 패널은 `h2`, 패널 안쪽은 `h3`.

---

## 12. 시각 회귀·반응형·이미지 테스트 (`tests/visual/`)

| 파일                      | 내용                                                                                              | 건수          |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------- |
| `public-pages.ts`         | 대상 경로 17개와 공통 준비 함수                                                                   | —             |
| `public-pages.spec.ts`    | 전체 화면 스냅샷                                                                                  | 17 × 2폭 = 34 |
| `responsive-a11y.spec.ts` | 가로 스크롤 없음 · `h1` 1개 · 레이블 없는 컨트롤 0개                                              | 34            |
| `images.spec.ts`          | 모든 `img` 의 `naturalWidth > 0`, CSS 배경 `none` 아님, 외부 호스트 0건, 분당점 탭 전환 후 재검사 | 36            |

실행: `npm run e2e:visual` → **104건 통과**. 기준 이미지는
`tests/visual/public-pages.spec.ts-snapshots/` 에 34장 커밋돼 있다.

### 12.1 스냅샷을 흔들리지 않게 한 방법

| 흔들림 요인                                                                                | 처리                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 개발 서버가 띄우는 Next.js 개발 도구 단추                                                  | `nextjs-portal, [data-nextjs-toast]` 를 `display:none` 으로 가림. 앱 코드가 아니라 테스트에서만 숨긴다                                                                 |
| PPR 로 본문이 나중에 흘러옴                                                                | 화면마다 `readyText` 를 정해 그 글자가 보일 때까지 기다린 뒤 촬영                                                                                                      |
| 글꼴 로딩                                                                                  | `document.fonts.ready` 를 기다림                                                                                                                                       |
| 홈 상단 배경 전환(CSS 애니메이션)                                                          | `toHaveScreenshot({ animations: "disabled" })` 로 첫 프레임에 고정                                                                                                     |
| Playwright 기본 `caret: "hide"` 가 입력란에 인라인 style 을 심어 React hydration 경고 발생 | `caret: "initial"` 로 바꿔 경고 0건                                                                                                                                    |
| 날짜·시각                                                                                  | **가릴 필요가 없었다.** 공개 화면에는 "오늘 기준" 표기나 D-n 라벨이 없고 seed 날짜가 고정이다. 모든 날짜 문구는 `Asia/Seoul` 고정으로 만든다(`src/lib/view-models.ts`) |

`mask` 는 쓰지 않았다. 대신 위 방법으로 흔들림 요인을 없앴다. 같은 커밋에서 3번 연속 실행해
전부 통과하는 것을 확인했다.

### 12.2 공지 목록·상세가 현재 시각에 의존하는 문제

`listNotices`/`getNotice` 는 `publishedAt <= new Date()` 로 거른다. `cacheComponents` 환경에서
Next 16 이 "unstable value `new Date()` while prerendering" 오류를 찍었다. 두 화면에
`await connection()` 을 넣어 요청 시점 렌더임을 알려 해결했다(서버 코드는 건드리지 않았다).

### 12.3 레거시 스크린샷과의 차이 분류 (Phase 3 Gate: 시각 차이 전부 분류)

비교 대상: `docs/evidence/screenshots/` 의 레거시 캡처 ↔ `tests/visual/.../*-visual-1440-darwin.png`.

> **캡처의 한계:** 레거시 홈·설명회·학원 소개 캡처는 스크롤 등장 애니메이션 때문에 본문이 비어 있다.
> 그 구간은 DOM 증거(`docs/evidence/dom/*.yml`)로 비교했다.

| #   | 화면                              | 차이                                                                              | 분류                                                                             |
| --- | --------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | 전 화면                           | 헤더 로고가 글자 → **레거시 로고 이미지**                                         | 수정 완료 (2차)                                                                  |
| 2   | 전 서브 화면                      | 상단 배너가 단색 → **레거시 배경 사진**                                           | 수정 완료 (2차)                                                                  |
| 3   | 홈                                | 히어로 배경이 단색 → **레거시 사진 3장 전환**                                     | 수정 완료 (2차)                                                                  |
| 4   | 강사진                            | 사진 없음 → **레거시 강사 사진** (사진 미지정 강사는 레거시와 같은 로고 자리표시) | 수정 완료 (2차)                                                                  |
| 5   | 시설안내                          | 사진 없음 → **학원 사진 8장 + 공간 카드 사진**                                    | 수정 완료 (2차)                                                                  |
| 6   | 학원 소개                         | 1번 탭 사진 없음 → **수업현장 사진**                                              | 수정 완료 (2차)                                                                  |
| 7   | 시설안내 `책과 글을 위한 교실` 칸 | 사진 자리를 CSS 배경으로 둠                                                       | 의도된 개선 — 레거시 원본이 Unsplash 에서 404 라 **레거시 화면에서도 깨져 있다** |
| 8   | 홈                                | 히어로 아래 슬라이드 점(carousel dots) 없음                                       | 의도된 개선 — 슬라이드 수·순서만 관찰됐고 점 조작 UI는 관찰하지 못했다           |
| 9   | 시간표                            | 지점 탭 앞 핀·건물 아이콘 없음                                                    | 의도된 개선 — 아이콘 자산 미확보, 글자만으로 뜻이 통한다                         |
| 10  | 예약 확인                         | 제목 옆 사람 아이콘, 입력란 앞 아이콘 없음                                        | 같음                                                                             |
| 11  | 푸터 SNS                          | 아이콘 글리프 → `인스타그램`·`네이버 블로그` 글자 링크                            | 의도된 개선 — 아이콘 자산 미확보 + 스크린리더에서 이름이 읽힌다                  |
| 12  | 예약 확인                         | 조회 버튼 색이 남색 → 브랜드 초록                                                 | 의도된 개선 — 버튼 색을 한 가지로 통일                                           |
| 13  | 전 폼                             | 필수 항목에 `*` 와 `(필수)` 숨은 글자 추가                                        | 의도된 개선 — 접근성                                                             |
| 14  | 시간표 카드                       | 카드 머리글이 모두 `문해와 사유` → **구분 섹션 값**(정규강좌/특강/진단평가)       | 의도된 개선 — 관리자가 칸을 채우면 그대로 보인다                                 |
| 15  | 강사진                            | 레거시 마지막의 `등록된 프로필 정보가 없습니다.` 빈 카드 없음                     | 의도된 개선 — 내용 없는 레코드                                                   |
| 16  | 전 화면                           | 스크롤 등장 애니메이션 없이 처음부터 보임                                         | 의도된 개선 — 접근성·시각 회귀 안정성                                            |
| 17  | 홈·설명회·학원 소개               | 레거시 캡처에 비어 있던 본문이 신규에는 전부 보임                                 | 차이 아님 — 레거시 캡처의 한계                                                   |
| 18  | 시간표·설명회·공지                | 보이는 자료가 다름                                                                | 차이 아님 — seed 가짜 자료 대 레거시 운영 자료                                   |
| 19  | 홈                                | 레거시 제목이 `h2`, 신규는 `h1`                                                   | 의도된 개선 — ASM-046                                                            |
| 20  | 홈 하단                           | 레거시 `설명회 알림 신청` 폼 없음                                                 | 의도된 개선 — ASM-047                                                            |
| 21  | 오시는 길                         | 지도 iframe 없음(지도 링크만)                                                     | 의도된 개선 — ASM-050                                                            |
| 22  | 공지 목록                         | `검색` 버튼 없음                                                                  | 의도된 개선 — ASM-054                                                            |

**빠진 이미지 0건.** 레거시 스크린샷·EV-0012 의 모든 이미지 자리가 신규 화면에 들어갔다.
유일한 예외가 위 7번(원본 404)이고 사용자 결정에 따라 CSS 처리로 뒀다.

---

## 13. 이미지 반영 (EV-0012)

### 13.0 원인 — 왜 이미지 자리가 비어 있었나

1차 작업에서는 **레거시 이미지 파일을 확보하지 못해**(조정자 지시: 운영 사이트에서 내려받지
않는다, ASM-042) 로고는 글자, 상단 배너·히어로는 단색 그라데이션, 강사 카드·시설 카드는 사진 없이
글만 두었다. 2차 작업에서 조정자가 권리 확인(D6) 후 파일을 워크트리에 배치해 주어 전부 연결했다.
**FE 는 네트워크 요청을 한 번도 하지 않았다.**

### 13.1 반영 개수

| 묶음                                          | 파일 수         | 화면 연결                                                |
| --------------------------------------------- | --------------- | -------------------------------------------------------- |
| `public/images/brand/` 로고                   | 1               | 공통 헤더 (`next/image`, 모든 공개 화면)                 |
| `public/images/hero/` 배경                    | 4               | 홈 3장(CSS 배경 전환) + `/sub/*`·공지 공통 1장(CSS 배경) |
| `public/images/facility/facility-0*.jpg`      | 8               | 대치 탭 4장 / 분당 탭 4장 슬라이드                       |
| `public/images/facility/stock-0*.jpg`         | 5               | 공간 카드 (02·03 은 두 자리에서 재사용)                  |
| `public/images/about/class-scene.jpg`         | 1               | `/sub/about` 1번 탭                                      |
| `public/images/instructors/`                  | 14              | 강사 카드(`/sub/abouttch1`, `/sub/abouttch2` 공용)       |
| `app/favicon.ico`·`icon.png`·`apple-icon.png` | 3               | Next 메타데이터 파일 규칙으로 자동 인식 확인             |
| `app/opengraph-image.png`                     | 1               | `buildPageMetadata` 에서 **명시 연결**(아래 13.5)        |
| **합계**                                      | **33 + 4 = 37** | **전부 연결, 미사용 0건**                                |

`alt` 는 EV-0012 원문 그대로다(`문사유 아카데미 로고`, `김윤환 원장 사진`, `문사유 수업현장` 등).
학원 사진 슬라이드는 레거시처럼 `alt=""`(장식용)이다.

### 13.2 Unsplash 자리 9칸 처리

| 자리 (`alt`)                     | 처리                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| `절제된 색감과 따뜻한 소재`      | `facility/stock-01.jpg`                                            |
| `시야가 이어지는 공간`           | `facility/stock-02.jpg`                                            |
| `책과 글을 위한 교실`            | **사진 없음 → CSS 배경**. 원본이 Unsplash 404 (레거시도 깨져 있음) |
| `역할이 분명한 동선`             | `facility/stock-03.jpg`                                            |
| `책과 가까워지는 북카페`         | `facility/stock-04.jpg`                                            |
| `편안하게 머무는 독서 자리`      | `facility/stock-02.jpg` **재사용** (레거시와 같음)                 |
| `아이의 움직임까지 세심하게`     | `facility/stock-05.jpg`                                            |
| `머무는 시간 내내 쾌적하게`      | `facility/stock-03.jpg` **재사용** (레거시와 같음)                 |
| `문사유 수업현장` (`/sub/about`) | `about/class-scene.jpg`                                            |

→ **로컬 6장 사용 / 재사용 2칸 / 404 1칸 CSS 대체.**

### 13.3 강사 사진을 어떻게 붙였나

`src/lib/images.ts` 의 `resolveInstructorPhoto()` 가 이 순서로 고른다.

1. `Instructor.photoStorageKey` (관리자 화면에서 고른 값)
2. 레거시 강사 이름 (`김윤환 원장` → `kim-yoonhwan` …) — DB 를 바꾸지 않고도 레거시 명단이 그대로 붙는다
3. 둘 다 없으면 **학원 로고 자리표시**

3번은 레거시가 하던 것과 같다. 레거시의 `석혜선 선생님 사진` 과 `문해와 사유 사진` 이
**바이트 단위로 같은 로고 이미지**여서(EV-0012), 사진이 없는 자리에 로고를 넣는 방식임을 확인했다.
// ASM-080 — 석혜선 선생님 실제 사진이 있는지 원장님 확인이 필요하다.

관리자 강사 추가·수정 폼에 **강사 사진 선택 칸**을 넣었다(`photoStorageKey`). 커밋된 14개 키 중에서
고르고, 고르지 않으면 로고 자리표시가 들어간다.

**지금 기준 이미지에는 강사 사진이 보이지 않는다.** seed 의 강사가 `가상강사A/B/C` 세 명이고
`photoStorageKey` 가 비어 있어 전부 로고 자리표시로 나온다. 실제 사진이 붙는 것은
로컬 DB 에 `photoStorageKey` 를 넣어 눈으로 확인했고(브라우저 캡처), 확인 뒤 되돌렸다.
기준 이미지가 `prisma/seed.ts` 만으로 재현돼야 해서 DB 를 바꾼 상태를 커밋하지 않았다.
→ 조정자 요청 2번.

### 13.4 깨진 이미지 테스트

```
npm run e2e:visual          # 104건 통과 (스냅샷 34 + 반응형·접근성 34 + 이미지 36)
npm run e2e:visual -- --grep "깨진 이미지"   # 36건 통과
```

검사 내용: 공개 17경로 × 1440/390 에서 끝까지 스크롤해 모든 이미지를 불러온 뒤
`naturalWidth > 0`, CSS `background-image !== none`, `127.0.0.1` 이 아닌 이미지 0건.
시설안내는 분당점 탭을 눌러 숨어 있던 사진까지 따로 검사한다.

### 13.5 아이콘·OG 확인

- `app/favicon.ico`·`icon.png`·`apple-icon.png` 는 Next 16 파일 규칙으로 자동 인식된다.
  (`<link rel="icon" ... sizes="16x16">`, `sizes="192x192"`, `<link rel="apple-touch-icon" sizes="180x180">`)
- `app/opengraph-image.png` 는 **자동으로 붙지 않았다.** 페이지가 `metadata.openGraph` 를 직접
  정의하면 파일 규칙 이미지가 합쳐지지 않는다. `src/lib/metadata.ts` 의 `buildPageMetadata` 에서
  `openGraph.images` 로 명시해 `og:image`·`og:image:width/height/alt` 가 나오게 했다.
- 직접 만들었던 `app/icon.svg` 는 삭제했다(레거시 파비콘 우선).

### 13.6 검증 결과

```
grep -rn "STUB" app src                  → 0건
grep -rn "munsayu.com/img" app src       → 0건
grep -rn "images.unsplash.com" app src   → 1건 (src/lib/images.ts 의 설명 주석)
grep -rn "munsayu.com" app src           → 1건 (site-config.ts 의 SITE_ORIGIN, canonical 용도)
public/ 전체                              → 33개 / 8.1MB / 2MB 초과 0개
public/ 미사용 파일                        → 0개 (Next 스타터 SVG 5개는 1차 작업에서 이미 삭제)
```

---

## 14. 잡정리 결과

### 14.1 `middleware.ts` → `proxy.ts`

- Next 16 은 `middleware` 파일 규칙을 deprecated 로 보고 `proxy` 를 쓰라고 안내한다.
  파일은 **default export 또는 `proxy` 라는 이름의 함수**를 내보내야 한다
  (`node_modules/next/dist/build/analysis/get-page-static-info.js` 의 `validateMiddlewareProxyExports`).
  `config.matcher` 는 그대로 쓸 수 있고 `runtime` 같은 세그먼트 설정만 금지된다(proxy 는 항상 Node.js).
- 이름만 바꾸고 `export function proxy(...)` 로 고쳤다. `npm run dev`·`npm run build` 에서
  **deprecation 경고가 사라졌다.**
- 규칙 재확인(로컬 서버):

| 요청                                                    | 결과                                               |
| ------------------------------------------------------- | -------------------------------------------------- |
| `/bbs/board.php?bo_table=notice`                        | 308 → `/notice`                                    |
| `/bbs/board.php?bo_table=notice&wr_id=2`                | 308 → `/notice/2`                                  |
| `/bbs/login.php` / `register.php` / `password_lost.php` | 308 → `/login` / `/register` / `/account/recovery` |
| `/uAdmin/index.php`, `/adm`, `/adm/login.php`           | **410**, 본문에 `/admin` 문자열 **0건**            |
| `/bbs/other.php`                                        | 404 (ASM-057)                                      |

### 14.2 파비콘

조정자가 레거시 파비콘을 `app/favicon.ico` 로 넣어 주어, 내가 만들었던 `app/icon.svg` 는 지웠다.
권리 미확인 자산 0건은 그대로다(모든 이미지가 D6 로 확인됨, Unsplash 추정 건은
`docs/legacy/legacy-assets.json` 에 그렇게 기록돼 있다).

### 14.3 `src/lib/site.ts` 삭제 — **조정자 조치 필요**

지시대로 지웠다. 그런데 `tests/unit/site.test.ts`(조정자 소유)가 이 모듈을 import 하므로
**지금 `npx tsc --noEmit` 과 `npm run build` 가 그 한 줄에서 실패한다.**

```
tests/unit/site.test.ts(2,26): error TS2307: Cannot find module '../../src/lib/site'
```

`tests/unit/site.test.ts` 를 지우면 바로 해결된다. 내 코드만 놓고 보면 통과하는 것을
그 파일을 잠깐 치우고 `npm run build` 를 돌려 확인했다(성공, 72경로 생성).
→ 조정자 요청 1번.

### 14.4 레이아웃 분리

관리자 화면이 공개 헤더·푸터를 쓰지 않도록 레이아웃을 나눴다.

- `app/layout.tsx` — `<html>`·`<body>` 와 기본 메타데이터만
- `app/(public)/layout.tsx` — 건너뛰기 링크 + 공개 헤더·푸터 + 분석 스크립트
- `app/admin/(authed)/layout.tsx` — 관리자 머리글·메뉴·푸터 안내
- 홈은 `app/page.tsx` → `app/(public)/page.tsx` 로 옮겼다. **주소는 `/` 그대로다.**

---

## 15. 확인한 Next.js 16 API (2차)

Next DevTools MCP·Context7 이 없어 설치된 패키지를 직접 읽어 확인했다.

| 항목                             | 확인 결과                                                                         | 읽은 파일                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `proxy` 파일 규칙                | default 또는 `proxy` 이름 함수 export 필수. `config.matcher` 가능, `runtime` 금지 | `next/dist/build/analysis/get-page-static-info.js`, `next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` |
| `middleware`/`proxy` 파일명 상수 | `MIDDLEWARE_FILENAME = "middleware"`, `PROXY_FILENAME = "proxy"`                  | `next/dist/lib/constants.js`                                                                                              |
| `cookies()` / `headers()`        | 둘 다 `Promise` 반환 (async)                                                      | `next/dist/server/request/cookies.d.ts`, `headers.d.ts`                                                                   |
| 동적 `params` / `searchParams`   | 둘 다 `Promise`                                                                   | `.next/types/validator.ts`                                                                                                |
| `redirect` / `permanentRedirect` | `next/navigation` 에 있음 (화면에서는 `redirect` 사용)                            | `next/dist/client/components/redirect.d.ts`                                                                               |
| `revalidatePath(path, type?)`    | `next/cache` export                                                               | `next/dist/server/web/spec-extension/revalidate.d.ts`                                                                     |
| `connection()`                   | `next/server` export, `Promise<void>`                                             | `next/dist/server/request/connection.d.ts`                                                                                |
| 아이콘 파일 규칙                 | `favicon.ico`(app 루트), `icon.(ico\|jpg\|png\|svg)`, `apple-icon.(jpg\|png)`     | `next/dist/docs/.../01-metadata/app-icons.md`                                                                             |
| 세그먼트 설정 `instant`          | `true \| false \| object`. `false` 면 미리 렌더하지 않고 요청 시점에 막고 그린다  | `next/dist/build/segment-config/app/app-segment-config.{js,d.ts}`                                                         |
| Server Action 파일               | `"use server"` 파일은 async 함수만 export 가능 → 동기 도우미는 별도 파일          | (규칙에 맞춰 `src/lib/actions/internal.ts` 분리)                                                                          |

### `cacheComponents: true` 에서 배운 것

- 캐시하지 않는 읽기(DB 조회·`cookies()`)는 **`Suspense` 경계 안**에 있거나 `instant = false` 여야 한다.
- 공개 목록 화면은 `Suspense` 로 감싸 **정적 껍데기 + 흘러오는 본문(PPR)** 이 됐다.
- 상태 코드가 중요한 화면은 `Suspense` 를 쓰면 안 된다. 껍데기가 200 으로 먼저 나가 버려
  `notFound()` 가 404 를 만들지 못한다. `/notice/[id]` 는 `instant = false` 로 막고 그려 404 를 지켰다.
- 세션을 보고 바로 돌려보내야 하는 화면(회원 2개 + 관리자 전부)도 `instant = false` 다.

---

## 16. 새 ASM 후보 (조정자가 `open-questions.md` 로 옮길 것)

| 번호    | 무엇을 가정했나                                                                                               | 왜                                                                                                        | 어디에 반영했나                                                 | 바꾸는 방법                                                      | 원장님께 물을 질문                                              |
| ------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| ASM-070 | 공지 목록의 작성자 칸에 `문사유` 를 고정으로 보여 준다                                                        | 레거시 목록의 작성자가 모두 `문사유` 였는데(EV-0007) 신규 공지 모델에는 작성자 칸이 없다                  | `src/lib/view-models.ts` `NOTICE_AUTHOR_LABEL`                  | 작성자 칸이 필요하면 계약·스키마에 추가한다                      | 공지 작성자를 글마다 다르게 표시해야 하나요?                    |
| ASM-071 | 지점이 지정되지 않은 설명회는 `지점 공통 / 온라인` 묶음에 모은다                                              | 설명회의 `campusId` 가 비어 있을 수 있는데 레거시에는 그런 사례가 없었다                                  | `src/lib/view-models.ts` `EVENT_GROUP_WITHOUT_CAMPUS`           | 지점을 반드시 고르게 하려면 계약에서 `campusId` 를 필수로 바꾼다 | 지점 없이 여는 온라인 설명회가 있나요?                          |
| ASM-072 | 강사 약력은 줄바꿈 한 번을 항목 구분으로 보고 목록으로 보여 준다                                              | 레거시는 약력이 줄 단위 목록이었는데 DB 는 글 한 덩어리다                                                 | `src/lib/view-models.ts` `toInstructorCardView`                 | 항목을 따로 저장하려면 스키마를 바꾼다                           | (원장님께 물을 것 없음 — 입력 편의)                             |
| ASM-073 | 공개 헤더는 레거시처럼 항상 `로그인`·`회원가입` 만 보여 주고 로그인 상태를 표시하지 않는다                    | 최상위 레이아웃에서 쿠키를 읽으면 모든 공개 화면이 요청 시점 렌더가 된다                                  | `src/components/layout/site-header.tsx`                         | 상태 표시가 필요하면 헤더만 `Suspense` 안에서 세션을 읽는다      | 로그인하면 헤더에 이름·로그아웃이 보여야 하나요?                |
| ASM-074 | 회원 정보 수정 화면에서 이메일·휴대전화번호를 미리 채우지 않는다                                              | 현재 값을 읽는 공개 경로(`GET /api/account/profile`)가 없다                                               | `src/components/account/profile-forms.tsx`                      | BE 가 조회 경로를 만들면 값만 넘긴다                             | (원장님께 물을 것 없음 — 조정자 요청 3번)                       |
| ASM-075 | 화면은 지점 **이름**으로 DB 지점을 찾는다                                                                     | 경로(`/sub/schedule.n`)에 박힌 지점 값과 DB 가 만든 id 가 다르다                                          | `src/lib/data/public-content.ts`                                | 지점에 고정 코드를 두면 코드로 찾는다                            | (원장님께 물을 것 없음 — 내부 연결)                             |
| ASM-076 | ~~파비콘을 직접 그린 `icon.svg` 로 둔다~~ → **해소**. 조정자가 레거시 파비콘을 넣어 주어 `icon.svg` 를 지웠다 | —                                                                                                         | —                                                               | —                                                                | —                                                               |
| ASM-077 | 분석 스크립트 형식을 GA4(gtag.js)로 가정한다                                                                  | 업체가 미정이고 환경 변수 이름이 `ANALYTICS_PROVIDER_ID` 다                                               | `src/components/layout/analytics-script.tsx`                    | 업체가 정해지면 이 파일 하나만 바꾼다                            | 방문 통계는 어떤 도구로 보시겠어요? (GA4 / 다른 도구)           |
| ASM-078 | 관리자 계정 묶음은 회원 목록 1페이지 100건에서 `role === "ADMIN"` 으로 추린다                                 | 공유 계약의 회원 검색에 역할 필터가 없다                                                                  | `app/admin/(authed)/members/page.tsx`                           | 계약에 `role` 필터를 넣으면 서버에서 거른다                      | (원장님께 물을 것 없음 — 조정자 요청 4번)                       |
| ASM-079 | `/sub/Facility` 의 `책과 글을 위한 교실` 칸은 사진 없이 CSS 배경으로 둔다                                     | 레거시 원본이 Unsplash 에서 404 다. 레거시 화면에서도 깨져 있다                                           | `src/lib/images.ts`, `src/components/public/facility-panel.tsx` | 대체 사진을 받으면 등록부에 넣기만 하면 된다                     | 이 칸에 넣을 학원 사진을 주실 수 있나요?                        |
| ASM-080 | 사진이 지정되지 않은 강사 자리에는 학원 로고를 넣는다                                                         | 레거시의 `석혜선 선생님 사진` 과 `문해와 사유 사진` 이 같은 로고 파일이다                                 | `src/lib/images.ts` `INSTRUCTOR_PHOTO_FALLBACK`                 | 실제 사진을 받으면 등록부에 넣는다                               | 석혜선 선생님 사진이 따로 있나요? 지금은 로고가 들어가 있습니다 |
| ASM-081 | `/sub/Facility` 분당점 탭의 공간 카드는 **제목만** 두고 본문을 비운다                                         | 레거시 분당점 탭이 접혀 있어 본문을 관찰하지 못했다. 카드 제목은 레거시 이미지 `alt` 로 확인됐다(EV-0012) | `src/components/public/facility-panel.tsx` `BUNDANG_FEATURES`   | 분당점 소개 문구를 받으면 채운다                                 | 분당점 시설 소개 문구를 주실 수 있나요?                         |

---

## 17. 조정자에게 요청

1. **`tests/unit/site.test.ts` 삭제 — 지금 빌드가 깨져 있습니다.** 지시대로 `src/lib/site.ts` 를
   지웠는데 그 테스트가 import 합니다. `tests/` 는 조정자 소유라 건드리지 않았습니다.
   그 파일만 지우면 `npx tsc --noEmit` 과 `npm run build` 가 통과합니다(치우고 돌려서 확인함).
2. **seed 에 강사 사진 연결.** `prisma/seed.ts` 의 강사 3명에 `photoStorageKey` 를 넣어 주시면
   기준 이미지에도 실제 강사 사진이 들어갑니다. 쓸 수 있는 키는 `src/lib/images.ts` 의
   `INSTRUCTOR_PHOTOS` 14개입니다(`kim-yoonhwan`, `kim-minju`, …). 레거시 강사 14명을 그대로
   seed 에 넣어 주시면 공개 화면이 레거시와 같은 명단이 됩니다.
3. **`GET /api/account/profile` 추가 요청.** 회원 정보 수정 화면에서 현재 이메일·연락처를 미리
   채우려면 조회 경로가 필요합니다. 지금은 비워 두고 다시 입력하게 합니다(ASM-074).
4. **관리자 회원 검색에 `role` 필터.** `memberSearchSchema` 에 `role` 이 있으면 관리자 계정 묶음을
   서버에서 바로 추릴 수 있습니다. 지금은 1페이지 100건을 읽어 화면에서 거릅니다(ASM-078).
5. **관리자 설명회 목록이 `statusOptionId` 를 함께 돌려주면 좋겠습니다.** 지금은 공개 조회 결과에
   상태 **이름**만 있어 이름으로 옵션 id 를 되찾아 선택 상자에 씁니다(이름이 유일 제약이라 안전하지만
   간접적입니다).
6. **요청 횟수 제한에 헤더만 받는 변형 함수.** `enforceRateLimit(request, scope)` 가 `Request` 를
   받는데 화면(Server Action)에는 `Request` 가 없어 `x-forwarded-for` 만 담은 요청 객체를 만들어
   넘깁니다(`src/lib/actions/internal.ts`). `enforceRateLimitForIp(ip, scope)` 같은 함수가 있으면 깔끔합니다.
7. **소유권 표 갱신.** `docs/contracts/phase-3-4-ownership.md` 의 `middleware.ts` 를 `proxy.ts` 로,
   그리고 `src/lib/images.ts`·`app/icon.png` 같은 새 FE 파일을 반영해 주세요.
8. **`docs/evidence/assets/legacy-image-map.md` 가 제 브랜치에 없습니다.** 메인 체크아웃
   (`/Users/gimdohyeon_1/munsayu_v2_nextjs`)에서 읽어 작업했습니다. 병합할 때 함께 들어오면 됩니다.
9. **AD-009~AD-011 과 공지 관리자 CRUD 는 여전히 범위 밖입니다.** 관리자 개요 화면에 그 사실을
   적어 두었습니다.
10. **`npm run check:assets` 는 제 브랜치에 아직 없습니다.** 대신 손으로 확인했습니다:
    `public/` 33개 / 8.1MB / 2MB 초과 0개.

---

## 18. 실행한 명령과 결과 (2차)

| 명령                                                                                               | 결과                                                                   |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `npx tsc --noEmit`                                                                                 | 내 코드 오류 0. `tests/unit/site.test.ts` 1건만 실패 (조정자 요청 1번) |
| `npm run lint`                                                                                     | 통과 (오류 0, 경고 0)                                                  |
| `npx prettier --check 'app/**/*.tsx' 'src/**/*.ts' 'src/**/*.tsx' 'tests/visual/**/*.ts' proxy.ts` | 통과                                                                   |
| `npm run build`                                                                                    | 성공 (72경로). 단 위 테스트 파일을 잠깐 치워야 한다                    |
| `npm run e2e:visual`                                                                               | **104건 통과**                                                         |
| `grep -rn "STUB" app src`                                                                          | 출력 없음                                                              |
| `grep -rn "munsayu.com/img" app src`                                                               | 출력 없음                                                              |

브라우저(Playwright MCP, `127.0.0.1:3100`)로 직접 확인한 흐름

- FM-001: 시간표 → 수강예약 모달 → 가짜 값 제출 → 접수 문구 → **DB 에 1건 저장 확인**
- PG-011: 같은 이름·연락처로 조회 → 목록 1건 → 취소 확인 대화상자 → `취소됨`·DB `CANCELLED` 확인
- AD-001: `member01` 로 관리자 로그인 시도 → `관리자 계정이 아닙니다.` / `admin` 로그인 → `/admin`
- AD-004: 설명회 상태를 `접수마감` 으로 바꿈 → **공개 설명회 화면에 즉시 반영**(`revalidatePath`)
- AD-013: 원문 보기 → 이름·연락처 원문 표시 + `AuditLog` 에 `PII_VIEW` 1건, CSV 내려받기 →
  `CSV_EXPORT` 1건, 파기 미리 세기 → `0건` 과 실행 버튼 잠김
- 강사 사진: 로컬 DB 에 `photoStorageKey` 를 넣어 실제 사진이 나오는 것을 확인한 뒤 되돌림

확인 뒤 테스트 자료를 지우고 `prisma/seed.ts` 를 다시 돌려 DB 를 원래 상태로 되돌렸다.
운영 사이트(munsayu.com)에 보낸 요청은 **0건**이다.

---

## 19. Phase 3 Gate 자가 점검

| Gate 항목                                                             | 결과                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 모든 `PG-*` 구현, 시각 회귀 테스트(1440/390) 통과 또는 차이 사유 기록 | **충족** — 17경로 × 2폭 34장 통과, 차이 22건 전부 분류(12.3)                    |
| 레거시 URL 매핑·리다이렉트 테스트 통과                                | **충족** — RT-001/002/004 재확인(14.1). 다만 자동 테스트가 아니라 수동 확인이다 |
| 페이지별 메타데이터 이식 확인                                         | **충족** — 1차에서 확인, 2차에서 `og:image` 보강                                |
| 권리 미확인 자산 0건                                                  | **충족** — 모든 이미지가 D6 확인분. Unsplash 추정 건은 원장에 기록됨            |
| 반응형·접근성 기본 점검                                               | **충족** — 34건 자동 단언(가로 스크롤·`h1`·폼 레이블)                           |

미충족으로 남은 것: **없음.** 다만 17장 1번(조정자 소유 테스트 파일) 때문에 지금
`npm run build` 가 깨져 있다. 그 한 파일을 지우면 해결된다.

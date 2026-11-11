# Phase 3 FE 작업 노트 — 공개 화면·회원 화면·신청/예약 화면

작업 위치: 워크트리 `../munsayu-v2-fe`, 브랜치 `feat/frontend`
범위: 공개 페이지, 회원 화면, 신청·예약 화면, 레거시 URL 호환, 메타데이터
범위 밖(다음 작업): 관리자 화면(`app/admin/**`), 시각 회귀 테스트(`tests/visual/**`)

---

## 1. 구현한 기능 ID와 파일

| 기능 ID | 화면 | 경로 | 주요 파일 |
|---|---|---|---|
| PG-001 | 홈 | `/` | `app/page.tsx`, `src/components/home/hero.tsx`, `curriculum.tsx`, `cosmo.tsx`, `contact.tsx` |
| PG-002 | 학원 소개 | `/sub/about` | `app/(public)/sub/about/page.tsx`, `src/components/public/about-intro.tsx` |
| PG-003 | 오시는 길 | `/sub/Location` | `app/(public)/sub/Location/page.tsx`, `src/components/public/location-panel.tsx` |
| PG-004 | 시설안내 | `/sub/Facility` | `app/(public)/sub/Facility/page.tsx`, `src/components/public/facility-panel.tsx` |
| PG-005 | 강사진 안내 | `/sub/abouttch1` | `app/(public)/sub/abouttch1/page.tsx`, `src/components/public/instructor-list.tsx` |
| PG-006 | 분당점 강사진 | `/sub/abouttch2` | `app/(public)/sub/abouttch2/page.tsx` |
| PG-007 | 문해력 진단 안내 | `/sub/abouttch3` | `app/(public)/sub/abouttch3/page.tsx`, `src/components/public/diagnosis-section.tsx` |
| PG-008 | 대치본원 시간표 | `/sub/schedule.n` | `app/(public)/sub/schedule.n/page.tsx`, `src/components/public/timetable.tsx` |
| PG-009 | 분당점 시간표 | `/sub/schedule.g` | `app/(public)/sub/schedule.g/page.tsx`, `src/components/public/timetable.tsx` |
| FM-001 | 수강 예약 신청 모달 | 시간표 화면 | `src/components/public/course-reservation-dialog.tsx` |
| PG-010 | 현장설명회 예약 | `/sub/Presentation` | `app/(public)/sub/Presentation/page.tsx`, `src/components/public/event-list.tsx` |
| FM-002 | 설명회 예약 신청 모달 | 설명회 화면 | `src/components/public/event-reservation-dialog.tsx`, `src/lib/event-consent.ts` |
| PG-011 | 예약 확인 / 취소 | `/sub/Check` | `app/(public)/sub/Check/page.tsx`, `src/components/public/reservation-lookup.tsx` |
| PG-012 | 공지 목록·상세 | `/notice`, `/notice/{id}` | `app/(public)/notice/page.tsx`, `app/(public)/notice/[id]/page.tsx` |
| PG-013 | 로그인 | `/login` | `app/(public)/login/page.tsx`, `src/components/account/login-form.tsx` |
| PG-014 | 회원가입 | `/register` | `app/(public)/register/page.tsx`, `src/components/account/register-flow.tsx` |
| FM-003 | 계정 찾기·재설정·수정·탈퇴 | `/account/recovery`, `/account/password-reset`, `/account/profile`, `/account/withdraw` | `src/components/account/recovery-forms.tsx`, `password-reset-form.tsx`, `profile-forms.tsx`, `withdraw-form.tsx` |
| RT-001 | 공지 게시판 URL 308 | `/bbs/board.php?...` | `middleware.ts` |
| RT-002 | 인증 URL 308 | `/bbs/login.php`, `/bbs/register.php`, `/bbs/password_lost.php` | `middleware.ts` |
| RT-003 | 문해력 진단 외부 링크 유지 | 푸터·진단 안내 | `src/lib/site-config.ts`, `src/components/layout/site-footer.tsx` |
| RT-004 | `/uAdmin/**`, `/adm/**` 410 | — | `middleware.ts` |

공통 레이아웃: `app/layout.tsx`, `src/components/layout/site-header.tsx`, `site-footer.tsx`
공통 UI: `src/components/ui/` (`page-banner`, `section`, `tabs`, `campus-link-tabs`, `modal-dialog`, `disclosure`, `form-controls`)
공통 유틸: `src/lib/site-config.ts`, `metadata.ts`, `form-errors.ts`, `idempotency.ts`, `event-consent.ts`
스텁: `src/lib/data/stubs.ts`

---

## 2. 각 화면이 근거로 삼은 증거 파일

| 화면 | 증거 파일 | 가져온 것 |
|---|---|---|
| 공통 헤더 | `phase1-home.yml` 외 모든 스냅샷 | 상단 바 `상담센터 : (대치)02-563-5972 / (분당)031-713-5972`, 로그인·회원가입 링크, 메뉴 5개 이름과 순서 |
| 공통 푸터 | `phase1-about.yml` (전체 푸터가 펼쳐진 유일한 스냅샷) | 소개 문구 2줄, 지점 전화, 상담시간, ABOUT/PROGRAM/RESERVE/SNS 묶음과 링크 주소, 지점 주소, 대표·개인정보관리책임자·사업자번호·저작권 문구 |
| PG-001 홈 | `phase1-home.yml`, `phase1-home-1440.png` | 히어로 머리글·제목·본문·버튼 2개와 링크 주소, 바로가기 카드 4개, 5단계 학습 6칸, 교육과정 6칸, LEARNING SYSTEM 3칸, PROJECT COSMO 전체(통계 4개·학습 흐름 4단계·3교시·반 편성·진단평가 표·교재 2개), 상담 문구와 상담 가능시간, 설명회 섹션 문구 |
| PG-002 학원 소개 | `phase1-about.yml` | 배너 문구, 탭 3개 이름, 1번 탭 본문 전체(문해와 사유의 생각 / 어휘와 독서 / 우리가 바라보는 문해력 / 언어의 바탕 / 약속 / 상담 안내) |
| PG-003 오시는 길 | `phase1-location.yml` | 배너 문구, 지점 탭, 대치 주소·역세권 배지·지도 링크 3개, 주소/도보/상담전화 카드, 지하철 2개 노선 안내, 버스 정류장 표 3행 |
| PG-004 시설안내 | `phase1-facility.yml` | 배너 문구, 지점 탭, 대치 소개 문구, 슬라이드 제목, 공간 카드 4개(ATMOSPHERE/PERSPECTIVE/CLASSROOM/FLOW OF MOVEMENT), 상담 카드 |
| PG-005 강사진 | `phase1-teachers.yml`, `legacy-instructors.json` | 배너 문구, `PRO 강사진` 머리글, 강사 13명의 소속·이름·약력 전체 |
| PG-008/009 시간표 | `phase1-course.yml`, `phase1-schedule-g.yml`, `phase1-schedule-g-1440.png` | 배너 문구(지점별로 다름), 지점 링크 탭, 학년 묶음 3개, 강좌 카드 12개(머리글·강좌명·강의시간·개강일·상세보기·수강예약), 카드 레이아웃과 색 |
| FM-001 | `phase1-course-reservation-dialog.yml`, `phase1-course-form-contract.json` | 제목 `<지점> 수강 예약 신청`, 선택 강좌 정보 3줄, 입력란 3개와 안내 문구, 라디오 2묶음, 동의 안내 3항목, 필수 체크박스, 제출 버튼 문구 |
| PG-010 설명회 | `phase1-presentation.yml` | 배너 문구, `설명회 일정 확인 및 예약` 제목과 본문, 설명회 카드 10건(상태 표시·제목·일시·장소·상세보기·비활성 접수마감 버튼) |
| PG-011 예약 확인 | `phase1-check.yml` | 배너 문구, `예약 정보 입력 인증` 제목, 입력란 2개 이름과 안내 문구, 조회 버튼 문구, 주의사항 5개 원문 |
| PG-012 공지 | `phase1-notice.yml` | 배너 문구, Total 표시, 표 머리글 4개, 공지 2건(공지 배지·제목·작성자·날짜), 상세 URL 형식 |
| PG-013 로그인 | `phase1-login.yml` | `회원 로그인` 제목, 회원가입 링크, 입력란 안내 문구 2개, 로그인 버튼, `로그인 상태 유지` 체크박스, 아이디/비밀번호 찾기 링크 |
| PG-014 회원가입 | `phase1-register.yml` | 배너 문구, 안내 문구, `(필수) 회원가입약관` 상자 내용, 개인정보 표 2행, 체크박스 문구 3개, 취소하기·다음 버튼 |

---

## 3. 레거시와 의도적으로 다르게 만든 부분

| # | 레거시 | 신규 | 이유 |
|---|---|---|---|
| 1 | 홈 히어로 제목이 `h2`, 홈에 `h1` 없음 | 히어로 제목을 `h1` | Phase 3 Gate 접근성(제목 순서). ASM-046 |
| 2 | 홈 하단에 `설명회 알림 신청` 폼(학년·학생 이름·학교명·보호자 연락처) | 같은 문구 + 설명회 화면 링크 | 그 폼은 Phase 2 계약(FM-002)에 없고 개인정보 동의 절차도 없다. ASM-047 |
| 3 | 설명회 신청 폼 | 신규 설계(이름·연락처·학년·참석 인원 1~2·필수 동의) | 레거시 폼 미관찰, D9·`eventReservationSchema` 기준 신규 설계 |
| 4 | 강사 사진, 시설 사진 슬라이드, 배너 사진, 로고 이미지 | 이미지 없이 글·CSS로 구성 | 레거시 이미지 파일을 확보하지 못했고 운영 사이트에서 내려받지 않는다. ASM-042 |
| 5 | 오시는 길의 지도 iframe | 네이버·카카오·구글 지도 링크만 | 외부 요청을 만들지 않기 위해. ASM-050 |
| 6 | 강사 카드 위 마우스를 올리면 나타나는 `수강 예약하기` 버튼 | 항상 보이는 링크 | 키보드로도 쓸 수 있어야 한다. ASM-051 |
| 7 | `상세보기` 버튼이 별도 화면·모달로 추정 | 카드 안에서 펼쳐지는 영역 | 레거시 상세 내용을 관찰하지 못했다. ASM-044 |
| 8 | 공지 목록의 `검색` 버튼 | 넣지 않음 | 검색 계약이 없다. ASM-054 |
| 9 | 대치 4학년 주중반 개강일 표기 `11월 17월(화)` | `11월 17일(화)` | 레거시 데이터 오타. 스텁 값이고 DB 연결 시 사라진다 |
| 10 | 강사 목록 마지막의 `등록된 프로필 정보가 없습니다.` 빈 카드 | 넣지 않음 | 내용이 없는 레코드 |
| 11 | 강사진 배너 문구 `이미지에 마우스를 올리시면…` | `강사 카드에서 바로 수강 예약 화면으로 이동할 수 있습니다.` | 이미지·호버를 쓰지 않으므로 문구가 맞지 않는다 |
| 12 | Zod 기본 영어 오류 문구가 그대로 보일 수 있음 | 같은 뜻의 한국어로 바꿔 표시 | 계약은 그대로 두고 화면에서만 바꾼다. ASM-058 |

---

## 4. 확인한 Next.js 16 API와 확인 방법

Next DevTools MCP·Context7 이 없어 설치된 패키지의 타입 정의를 직접 읽어 확인했다.

| 항목 | 확인 결과 | 확인한 파일 |
|---|---|---|
| 동적 세그먼트 `params` | `Promise<ParamMap[Route]>` — `await` 해야 한다 | `.next/types/validator.ts` (`AppPageConfig`) |
| `generateMetadata` 시그니처 | `(props: { params: Promise<…> }, parent: ResolvingMetadata)` | `.next/types/validator.ts` |
| `generateStaticParams` | `(props: { params: ParamMap[Route] }) => any[] \| Promise<any[]>` | `.next/types/validator.ts` |
| Route Handler 시그니처 | `(request: NextRequest, context: { params: Promise<…> })` | `.next/types/validator.ts` (이번 범위에서는 Route Handler 를 쓰지 않음) |
| 타입 안전 라우트 | 켜져 있고 `Link href` 가 실제 경로로 검사된다 | `.next/types/routes.d.ts` |
| `redirect` / `permanentRedirect` | 둘 다 있고 Route Handler 에서 각각 307/308 | `node_modules/next/dist/client/components/redirect.d.ts` |
| middleware 타입 | `NextMiddleware` 는 `@deprecated`, `NextProxy` 로 이름이 바뀜 | `node_modules/next/dist/server/web/types.d.ts` |
| middleware 파일 이름 | `middleware` 와 `proxy` 둘 다 인식 (`MIDDLEWARE_FILENAME`, `PROXY_FILENAME`) | `node_modules/next/dist/lib/constants.js` |
| `config.matcher` 형식 | `string \| Array<string \| {source, has, missing, locale}>` | `node_modules/next/dist/build/segment-config/middleware/middleware-config.d.ts` |
| `NextResponse` / `NextRequest` | `next/server` 에서 export | `node_modules/next/server.d.ts` |
| Zod 4 오류 처리 | `z.flattenError` 존재, `$ZodIssue` 는 `code` 로 구분되는 union | `node_modules/zod/v4/core/errors.d.cts` |

`cacheComponents: true` 환경에서 `useSearchParams` 를 쓰는 비밀번호 재설정 폼만 `Suspense` 경계가 필요했고, 나머지 화면은 스텁 데이터를 동기 함수로 읽어 정적으로 미리 만들어진다(`npm run build` 결과에서 모든 경로가 `○ Static`, `/notice/[id]` 만 `◐ PPR`).

---

## 5. 남은 STUB 목록

`grep -rn "STUB" src app` 결과는 모두 `src/lib/data/stubs.ts` 한 파일 안에 있다 (총 37줄, 설명 주석 포함).

읽기 스텁

| 함수 | 바꿀 대상 |
|---|---|
| `listCoursesByCampusStub` | `src/server/services/courses` 시간표 조회 / `GET /api/courses?campus=` |
| `listEventsByCampusStub` | `src/server/services/events` 공개 설명회 목록 / `GET /api/events` |
| `listNoticesStub`, `findNoticeStub`, `countNoticesStub` | 공지 조회 / `GET /api/notices`, `GET /api/notices/{id}` |
| `listInstructorsStub`, `listBundangInstructorsStub` | `src/server/services/instructors` / `GET /api/instructors` |
| `getSessionUserStub` | `src/server/auth` 세션 조회 |

쓰기 스텁

| 함수 | 바꿀 대상 |
|---|---|
| `submitCourseApplicationStub` | `POST /api/course-applications` |
| `submitEventReservationStub` | `POST /api/event-reservations` |
| `lookupReservationsStub` | `POST /api/reservations/lookup` |
| `cancelReservationStub` | `POST /api/reservations/{id}/cancel` |
| `registerMemberStub` | `POST /api/auth/register` |
| `loginStub` | `POST /api/auth/login` |
| `findLoginIdStub` | `POST /api/auth/find-login-id` |
| `requestPasswordResetStub` | `POST /api/auth/password-reset/request` |
| `resetPasswordStub` | `POST /api/auth/password-reset/confirm` |
| `updateProfileStub` | `PATCH /api/account/profile` |
| `changePasswordStub` | `POST /api/account/password` |
| `withdrawStub` | `POST /api/account/withdraw` |

콘텐츠 스텁(값 자체도 교체 대상): `COURSE_STUBS`, `EVENT_STUBS`, `NOTICE_STUBS`, `INSTRUCTOR_STUBS`.

폼 검증은 스텁이 아니다. 모든 폼이 공유 계약의 Zod 스키마로 실제 검증하고 필드별 오류를 화면에 띄운다. 네트워크 호출만 스텁이다.

---

## 6. 새 ASM 후보 (조정자가 `docs/reports/open-questions.md` 로 옮길 것)

| 번호 | 무엇을 가정했나 | 왜 | 어디에 반영했나 | 바꾸는 방법 | 원장님께 물을 질문 |
|---|---|---|---|---|---|
| ASM-040 | 주 메뉴 5개의 하위 항목을 관찰된 공개 경로로 채웠다 | 레거시 메뉴 링크가 `javascript:;` 드롭다운이라 하위 항목을 관찰할 수 없었다 | `src/lib/site-config.ts` `MAIN_NAV` | 실제 메뉴 구성을 받으면 배열만 고친다 | 상단 메뉴를 눌렀을 때 나오는 하위 항목이 각각 무엇인가요? |
| ASM-041 | 글꼴은 시스템 글꼴 묶음만 쓴다(Apple SD Gothic Neo → Noto Sans KR → Malgun Gothic 순) | 레거시 글꼴 라이선스 미확인(D6, ASM-011). 웹폰트 파일을 저장소에 넣지 않는다 | `app/globals.css` `--font-sans` | 라이선스 확인된 글꼴로 교체하거나 `next/font` 사용 | 현재 쓰는 글꼴의 사용 권한을 확인할 수 있나요? |
| ASM-042 | 레거시 이미지(로고·강사 사진·시설 사진·배너 사진) 없이 글·CSS로만 구현한다 | 이미지 권리는 학원 귀속으로 확정됐지만(D6) **실제 파일을 확보하지 못했고** 운영 사이트에서 내려받지 않는다 | `src/components/ui/page-banner.tsx`, `instructor-list.tsx`, `facility-panel.tsx`, 헤더 로고 | 원본 이미지를 받으면 `next/image` 로 교체 | 홈페이지에 쓰던 로고·강사 사진·시설 사진 원본 파일을 주실 수 있나요? |
| ASM-043 | `/sub/abouttch2` 는 분당점 강사진, `/sub/abouttch3` 는 문해력 진단 안내로 만든다 | 두 경로의 내용을 관찰하지 못했다. abouttch3 은 홈의 `문해력 진단 신청` 카드가 가리키던 주소다 | `app/(public)/sub/abouttch2/page.tsx`, `abouttch3/page.tsx` | 실제 내용을 받으면 페이지 본문만 바꾼다 | `/sub/abouttch2`, `/sub/abouttch3` 페이지는 각각 어떤 내용인가요? |
| ASM-044 | 강좌·설명회의 `상세보기`는 카드 안에서 펼쳐지는 요약으로 만든다 | 레거시 상세 내용을 관찰하지 못했다 | `src/components/public/timetable.tsx`, `event-list.tsx` | 상세 항목이 정해지면 펼침 영역 내용을 늘린다 | 강좌·설명회 `상세보기`에는 어떤 내용이 나오나요? |
| ASM-045 | 설명회 목록에 `접수중`·`마감임박` 예시 일정을 임시로 넣었다 | 레거시 관찰 시점에 접수 가능한 일정이 없어 신청 폼을 열 수 없다 | `src/lib/data/stubs.ts` `EVENT_STUBS` | BE 연결 시 전부 사라진다 | (원장님께 물을 것 없음 — 개발용 임시 값) |
| ASM-046 | 홈 히어로 제목을 `h1`으로 올린다 | 레거시 홈에는 `h1`이 없어 제목 순서가 맞지 않는다 | `src/components/home/hero.tsx` | 레거시와 똑같이 맞추려면 `h2`로 되돌린다 | (원장님께 물을 것 없음 — 접근성 기준) |
| ASM-047 | 홈 하단 `설명회 알림 신청` 폼을 없애고 설명회 화면 링크로 바꾼다 | 그 폼은 Phase 2 계약에 없고 동의 절차 없이 개인정보를 받는다 | `src/components/home/contact.tsx` | 홈에서도 신청을 받으려면 FM-002 계약을 홈에 다시 붙인다 | 홈 화면에서도 설명회 알림 신청을 바로 받아야 하나요? |
| ASM-048 | 학원 소개 2·3번 탭은 홈에서 관찰한 PROJECT COSMO·진단평가 내용을 쓴다 | 레거시 2·3번 탭 본문을 관찰하지 못했다 | `app/(public)/sub/about/page.tsx` | 실제 본문을 받으면 탭 패널만 바꾼다 | 학원 소개 2·3번 탭에는 어떤 내용이 들어가나요? |
| ASM-049 | 오시는 길·시설안내의 분당점 탭은 공개된 주소·전화만 보여 준다 | 레거시 분당점 탭이 접혀 있어 관찰하지 못했다 | `src/components/public/location-panel.tsx`, `facility-panel.tsx` | 분당점 교통·시설 내용을 받으면 채운다 | 분당점 오시는 길·시설 안내에 넣을 내용을 주실 수 있나요? |
| ASM-050 | 지도는 iframe 대신 네이버·카카오·구글 지도 링크만 제공한다 | 지도 iframe 은 외부 요청을 만들고 지도 서비스 키가 필요하다 | `src/components/public/location-panel.tsx` | 지도 서비스를 정하면 임베드로 바꾼다 | 홈페이지에 지도를 직접 띄우길 원하시나요? |
| ASM-051 | 강사 카드의 `수강 예약하기`는 항상 보이는 링크로 두고 대치 시간표로 보낸다 | 레거시는 사진 위 마우스를 올려야 나타나 키보드로 쓸 수 없다 | `src/components/public/instructor-list.tsx` | 강사별 강좌가 생기면 해당 강좌로 보낸다 | 강사별로 담당 강좌를 연결해야 하나요? |
| ASM-052 | 설명회 동의 문구는 강좌 동의 문구를 바탕으로 목적·수집항목·보유기간만 바꿨다 | 레거시 설명회 폼 미관찰, 공유 계약에 설명회용 상수 없음 (ASM-009 기준 적용) | `src/lib/event-consent.ts` | 조정자가 계약으로 옮기거나 문구를 고친다 | 설명회 신청 때 보여 줄 개인정보 안내 문구를 확인해 주실 수 있나요? |
| ASM-053 | 예약 확인 화면의 주의사항 5개를 레거시 문구 그대로 둔다 | 운영 안내 문구라 임의로 고치지 않는다 | `app/(public)/sub/Check/page.tsx` | 문구를 받아 수정한다 | 문자·알림톡을 보내지 않기로 했는데(D4), `안내 문자 발송 트랙` 문구는 어떻게 바꿀까요? |
| ASM-054 | 공지 목록의 검색 기능을 넣지 않는다 | 검색 계약이 없다 | `app/(public)/notice/page.tsx` | 검색 계약이 생기면 추가한다 | 공지사항 검색이 꼭 필요하신가요? |
| ASM-055 | 회원가입 2단계와 정보 수정 화면은 계약 스키마만 따른다 | 레거시 2단계·정보 수정 화면을 관찰하지 못했다(제출·동의 클릭 금지) | `src/components/account/register-flow.tsx`, `profile-forms.tsx` | 실제 항목을 받으면 계약과 함께 바꾼다 | 회원가입 때 추가로 받는 항목이 있나요? |
| ASM-056 | 회원가입 약관 상자에 레거시 문구(`해당 홈페이지에 맞는 회원가입약관을 입력합니다.`)를 그대로 둔다 | 레거시에 실제 약관이 들어 있지 않았다 | `src/components/account/register-flow.tsx` | 실제 약관 본문을 받아 넣는다 | 회원가입 약관 전문을 주실 수 있나요? |
| ASM-057 | `/bbs/**` 중 매핑에 없는 주소는 404로 둔다 | `route-compatibility-map.json` 에 공지·인증 외의 게시판이 없다 | `middleware.ts` | 다른 게시판이 있으면 매핑에 추가한다 | 공지 말고 쓰시던 게시판이 더 있나요? |
| ASM-058 | Zod 기본 영어 오류 문구를 화면에서 한국어로 바꿔 보여 준다 | 공유 계약의 일부 스키마(`personNameSchema` 등)에 한국어 문구가 없다 | `src/lib/form-errors.ts` | 계약에 한국어 문구를 넣으면 이 변환이 자동으로 비켜 간다 | (원장님께 물을 것 없음 — 화면 문구 처리) |

---

## 7. 조정자에게 요청

1. **`src/lib/contracts/common.ts` 문구 보강 제안.** `personNameSchema`, `schoolName`(`courseApplicationSchema`), `loginIdSchema` 등 일부 스키마에 한국어 오류 문구가 없어 Zod 기본 영어 문구가 나온다. 지금은 FE에서 한국어로 바꿔 표시하지만(ASM-058), 계약에 문구를 넣는 쪽이 FE·BE 응답이 같아진다. 계약 변경이라 FE가 손대지 않았다.
2. **브랜치가 `feat/phase-3-4` 보다 3커밋 뒤에 있다.** 작업 중 조정자가 `5c7beaa`(openapi 44경로 기록, 관리자 계약 보강), `568dec2`(410 규칙에 RT-004 부여), `a80ecbf`(migration-status 뼈대)를 올렸다. 확인 결과 공개 화면이 쓰는 계약(`common`·`applications`·`reservations`·`auth`)은 바뀌지 않았고, 새로 생긴 `POST /api/account/password` 와 RT-004 는 이 작업에 반영했다. 병합 시 충돌은 없을 것으로 보인다.
3. **`src/lib/event-consent.ts` 이동 여부.** 설명회 동의 문구 상수를 FE 쪽에 두었다(ASM-052). BE도 저장 시 같은 문구·`policyVersion` 이 필요하면 `src/lib/contracts/applications.ts` 로 옮겨 주시기 바란다.
4. **`middleware.ts` → `proxy.ts` 이름 변경.** Next.js 16.4.5 빌드가 `middleware` 파일 규칙을 deprecated 로 경고한다(`npx @next/codemod@canary middleware-to-proxy .`). 지시가 `middleware.ts` 였고 소유권 표에도 `middleware.ts` 로 적혀 있어 그대로 두었다. 이름을 바꾸려면 소유권 표도 함께 고쳐야 한다.
5. **`src/lib/site.ts` 와 `tests/unit/site.test.ts` 정리.** Phase 0 하네스 상수를 확인하는 테스트라 기능과 무관하다. `tests/` 가 조정자 소유여서 지우지 않고 `src/lib/site.ts` 를 남겨 두었다. 테스트를 정리할 때 함께 지우면 된다.
6. **`app/favicon.ico` 교체.** Next.js 스타터 기본 파비콘이 그대로 남아 있다. 소유권 표에 없는 파일이라 손대지 않았다. 학원 파비콘을 받으면 교체가 필요하다.
7. **`/uAdmin/` 처럼 끝에 슬래시가 붙은 주소.** Next 기본 동작이 미들웨어보다 먼저 `/uAdmin` 으로 308 하고, 그다음 410 이 나간다. 최종 상태는 410 이고 `/admin` 은 드러나지 않는다. 한 번에 410 으로 보내려면 `next.config.ts` 에 `skipTrailingSlashRedirect: true` 가 필요한데 조정자 소유 파일이라 바꾸지 않았다.

---

## 8. 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `npx tsc --noEmit` | 통과 (오류 0) |
| `npm run lint` | 통과 (오류 0, 경고 0) |
| `npx prettier --check app src middleware.ts` | 통과 |
| `npm run build` | 성공. 22개 경로 생성, `/notice/[id]` 만 PPR, 나머지 정적 |
| `npx vitest run --project unit` | 1 파일 / 1 테스트 통과 |
| `npm run dev -- --hostname 127.0.0.1 --port 3100` | 기동 확인 |

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

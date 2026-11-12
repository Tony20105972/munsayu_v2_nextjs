# 기능 이관 현황

> Phase 3·4 통합(C-3) 완료 시점. 기준 ID는 `docs/contracts/migration-matrix.md`입니다.
> 상태: `미구현` / `구현` / `테스트 통과` / `동등성 확인`(Phase 5)
> 테스트 수는 `tests/` 안에서 해당 기능 ID를 참조하는 횟수입니다.

| ID     | 기능                           | 담당  | 상태        | 구현 위치                                                              | 테스트 참조                                   |
| ------ | ------------------------------ | ----- | ----------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| PG-001 | 홈                             | FE    | 테스트 통과 | `app/(public)/page.tsx, src/components/home/*`                         | 1건                                           |
| PG-002 | 학원안내 `/sub/about`          | FE    | 테스트 통과 | `app/(public)/sub/about`                                               | 1건                                           |
| PG-003 | 지점안내 `/sub/Location`       | FE    | 테스트 통과 | `app/(public)/sub/Location`                                            | 1건                                           |
| PG-004 | 시설안내 `/sub/Facility`       | FE    | 테스트 통과 | `app/(public)/sub/Facility`                                            | 2건                                           |
| PG-005 | 강사진 `/sub/abouttch1`        | FE    | 테스트 통과 | `app/(public)/sub/abouttch1`                                           | 1건                                           |
| PG-006 | 강사진 `/sub/abouttch2`        | FE    | 테스트 통과 | `app/(public)/sub/abouttch2`                                           | 1건                                           |
| PG-007 | 강사진 `/sub/abouttch3`        | FE    | 테스트 통과 | `app/(public)/sub/abouttch3`                                           | 1건                                           |
| PG-008 | 대치 시간표 `/sub/schedule.n`  | FE+BE | 테스트 통과 | `app/(public)/sub/schedule.n, services/courses.ts`                     | 1건                                           |
| PG-009 | 분당 시간표 `/sub/schedule.g`  | FE+BE | 테스트 통과 | `app/(public)/sub/schedule.g, services/courses.ts`                     | 1건                                           |
| PG-010 | 설명회 `/sub/Presentation`     | FE+BE | 테스트 통과 | `app/(public)/sub/Presentation, services/events.ts`                    | 1건                                           |
| PG-011 | 예약 조회·취소 `/sub/Check`    | FE+BE | 테스트 통과 | `reservation-lookup.tsx, services/reservations.ts`                     | 15건                                          |
| PG-012 | 공지 목록·상세 `/notice`       | FE+BE | 테스트 통과 | `app/(public)/notice, services/notices.ts`                             | 7건                                           |
| PG-013 | 로그인 `/login`                | FE+BE | 테스트 통과 | `app/(public)/login, services/accounts.ts`                             | 1건                                           |
| PG-014 | 회원가입 `/register`           | FE+BE | 테스트 통과 | `app/(public)/register, services/accounts.ts`                          | 1건                                           |
| FM-001 | 강좌 수강 신청                 | FE+BE | 테스트 통과 | `course-reservation-dialog.tsx, services/course-applications.ts`       | 25건                                          |
| FM-002 | 설명회 예약 (신규 설계)        | FE+BE | 테스트 통과 | `event-reservation-dialog.tsx, services/event-reservations.ts`         | 15건                                          |
| FM-003 | 회원 lifecycle                 | FE+BE | 테스트 통과 | `src/components/account/*, services/accounts.ts`                       | 20건                                          |
| BZ-001 | 마감 상태에서 신청 차단        | BE    | 테스트 통과 | `services/courses.ts, services/events.ts`                              | 7건                                           |
| BZ-002 | 개인정보 보유 문구·파기 연동   | BE    | 테스트 통과 | `services/privacy.ts`                                                  | 5건                                           |
| AD-001 | 관리자 로그인·로그아웃         | FE+BE | 테스트 통과 | `app/admin/login, server/auth/*`                                       | 14건                                          |
| AD-002 | 회원 관리·관리자 계정          | FE+BE | 테스트 통과 | `app/admin/(authed)/members, services/members.ts`                      | 12건                                          |
| AD-003 | 설명회 관리                    | FE+BE | 테스트 통과 | `app/admin/(authed)/events, services/events.ts`                        | 5건                                           |
| AD-004 | 설명회 상태 수동 전환          | FE+BE | 테스트 통과 | `events-panels.tsx, services/events.ts`                                | 3건                                           |
| AD-005 | 예약자·참석 인원 집계          | FE+BE | 테스트 통과 | `app/admin/(authed)/events/[id], applications-admin.ts`                | 2건                                           |
| AD-006 | 강사·팀 관리                   | FE+BE | 테스트 통과 | `app/admin/(authed)/instructors, services/instructors.ts`              | 9건                                           |
| AD-007 | 시간표·강좌 관리               | FE+BE | 테스트 통과 | `app/admin/(authed)/courses, services/courses.ts`                      | 6건                                           |
| AD-008 | 강좌 신청 목록                 | FE+BE | 테스트 통과 | `app/admin/(authed)/applications, applications-admin.ts`               | 6건                                           |
| AD-009 | 입학진단·상담 신청 관리        | FE+BE | 테스트 통과 | `app/admin/(authed)/consultations, services/consultations.ts`          | 14건 (공개 화면은 관리자 설정의 구글 폼 링크) |
| AD-010 | 설명회 알림 신청(문자신청내역) | FE+BE | 테스트 통과 | `components/home/event-notice-form.tsx, services/sms-subscriptions.ts` | 8건 (문자 발송 없음)                          |
| AD-011 | 강사 지원 관리                 | FE+BE | 테스트 통과 | `app/(public)/sub/Recruit, services/instructor-applications.ts`        | 16건 + E2E 2건                                |
| AD-014 | 공지사항 관리                  | FE+BE | 테스트 통과 | `app/admin/(authed)/notices, services/notices-admin.ts`                | 18건 + 단위 12건 + E2E 1건                    |
| AD-012 | 분석 도구 ID 자리              | FE    | 테스트 통과 | `src/components/layout/analytics-script.tsx`                           | 6건                                           |
| AD-013 | 개인정보 조회·CSV·파기 기록    | FE+BE | 테스트 통과 | `app/admin/(authed)/privacy, services/privacy.ts, audit.ts`            | 23건                                          |
| RT-001 | 공지 레거시 URL 308            | FE    | 테스트 통과 | `proxy.ts`                                                             | 2건                                           |
| RT-002 | 인증 레거시 URL 308            | FE    | 테스트 통과 | `proxy.ts`                                                             | 1건                                           |
| RT-003 | 외부 입학진단 링크 유지        | FE    | 테스트 통과 | `proxy.ts, site-footer.tsx`                                            | 1건                                           |
| RT-004 | `/uAdmin/**`·`/adm/**` 410     | FE    | 테스트 통과 | `proxy.ts`                                                             | 2건                                           |

## 범위에서 제외한 것

| ID                            | 이유                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| ~~AD-011~~                    | **해소.** Phase 5에서 `/sub/Recruit` 를 관찰해(EV-0014) 계약을 만들고 구현했다. (ADR-007) |
| ~~AD-014 (관리자 공지 편집)~~ | **해소.** Phase 5에서 공지 단일 게시판으로 구현했다. (ADR-007, ASM-089)                   |
| 그누보드 게시판 엔진          | 게시판·그룹·포인트·스킨·SNS·접속기기 설정은 옮기지 않는다 (ASM-089)                       |
| 문자 발송                     | AD-010 은 신청 내역만 남기고 발송하지 않는다 (D4, ASM-086)                                |

## 테스트 명령과 결과 (Phase 5, 2026-11-12)

| 명령                     | 결과       |
| ------------------------ | ---------- |
| `npm test` (단위 + 통합) | 304건 통과 |
| `npm run e2e`            | 52건 통과  |

## 테스트 명령과 결과 (통합 브랜치, 2026-11-11)

| 명령                                | 결과                                  |
| ----------------------------------- | ------------------------------------- |
| `npm test` (단위 + 통합)            | 210건 통과                            |
| `npm run e2e`                       | 37건 통과                             |
| `npm run e2e:visual`                | 104건 통과                            |
| `npm run build`                     | 성공                                  |
| `npm run lint` / `npx tsc --noEmit` | 오류 0                                |
| `npm run check:assets`              | `public/` 33개 / 8.05MB, 2MB 초과 0개 |

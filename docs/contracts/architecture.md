# Phase 2 아키텍처 계약

## 컴포넌트 트리

```text
app/layout.tsx
└─ SiteShell
   ├─ Header (학원안내·강사진·시간표·설명회·예약확인, 로그인·가입)
   ├─ PublicPage
   │  ├─ AcademyPage / LocationPage / FacilityPage
   │  ├─ InstructorDirectory → InstructorCard
   │  ├─ TimetablePage → CourseCard → CourseReservationForm
   │  ├─ EventListPage → EventCard → EventReservationForm
   │  ├─ ReservationLookup → ReservationList → ReservationCancelDialog
   │  ├─ NoticeList / NoticeDetail
   │  └─ Login / Register / AccountRecovery / AccountProfile
   └─ Footer (강좌·설명회·외부 진단 링크)
app/admin/layout.tsx
└─ RequireAdmin → AdminNav → management pages
```

Header/footer and public route evidence: EV-0003, EV-0007. Forms are client UI plus Server Action; public programmatic endpoints are Route Handlers.

입력 스키마의 실행 가능한 원본은 `src/lib/contracts/`이고 HTTP 계약은 `openapi.yaml`이다. 두 곳은 공유 소유이며, 바꿀 때는 이 문서를 먼저 고치고 ADR을 남긴다.

## 서버 모듈

| 모듈 | 책임 | 기능 | 근거 |
|---|---|---|---|
| `auth` | 회원·관리자 세션, 로그인 유지, 계정 복구 | FM-003, AD-001/002 | EV-0007, EV-ADM-01/02, ASM-002 |
| `courses` | 지점·강좌·시간표·신청 현황 | PG-008/009, AD-007/008 | EV-0006, EV-ADM-05 |
| `course-applications` | 강좌 신청, 동의, 마감 트랜잭션 | FM-001, BZ-002, AD-013 | EV-0006, EV-0010 |
| `events` | 설명회·상태 목록·관리코드 | PG-010, AD-003/004 | EV-0005, EV-ADM-03, ASM-001/005 |
| `event-reservations` | 설명회 예약, 조회·취소, 참석 합계 | FM-002, PG-011, AD-005 | EV-0008, EV-ADM-03, ASM-001 |
| `instructors` | 강사·팀 소속·노출 순서 | AD-006 | EV-ADM-04, ASM-003 |
| `privacy` | 보존 설정, 파기, 열람·CSV 감사기록 | AD-013 | EV-0006 |
| `storage` / `notify` / `analytics` | 외부 서비스 어댑터 | AD-010~012 | ASM-004/007/008 |

## 상태와 트랜잭션

```text
설명회: 접수중 ↔ 마감임박 ↔ 접수마감
           (관리자 수동 전환만, 자동 전환 없음)  // ASM-001
예약: PENDING → CONFIRMED → CANCELLED
강좌: 접수중 ↔ 접수마감 (관리자 수동 전환만)
신청: PENDING → CONFIRMED → CANCELLED
```

예약/신청 생성은 하나의 DB 트랜잭션에서 공개 접수 상태를 확인하고 저장한다. 정원 숫자는 차단 조건이 아니며, 같은 연락처의 의도적인 재신청도 허용한다. 같은 idempotency key 재전송만 기존 결과를 돌려주고 새로 저장하지 않는다. `접수마감`은 새 신청을 409으로 막는다.

## 입력 계약

| 흐름 | 필수 입력 | 결과 |
|---|---|---|
| FM-001 강좌 신청 | `courseId`, 학생 이름, 보호자 연락처, 학교, 과정, 학년, 동의, idempotency key | 201 신청 생성; 접수마감 409; 유효성 422. 같은 idempotency key 재전송은 201 + `replayed: true`로 기존 건 반환 |
| FM-002 설명회 예약 | `eventId`, 이름, 연락처, 학년, 참석 인원(1~2), 동의, idempotency key | 201 예약 생성; 마감 409; 유효성 422. 같은 idempotency key 재전송은 기존 건 반환 |
| PG-011 예약 조회·취소 | 조회: 이름·연락처. 취소: 같은 본인 확인 정보 + `kind`·예약 식별자 | 같은 연락처의 강좌 신청·설명회 예약을 목록으로 반환(ASM-013); 취소는 건별 상태 변경, 불일치는 404 |
| FM-003 회원 | 아이디, 비밀번호, 이름, 이메일, 휴대폰(가입); 자격증명(로그인) | 가입·세션 생성, 아이디/이메일 중복 409, 검증 422. 찾기·수정·탈퇴도 같은 계약 묶음 |

PII는 응답·로그에 원문을 쓰지 않고 관리자 목록은 마스킹한다. CSV와 원문 조회는 단일 관리자 역할에서도 매 요청 인증·감사기록을 남긴다.

보존 정책은 `PrivacyRetentionSetting`의 표시 문구와 동의 문구가 같은 값을 사용한다. 각 신청·예약에는 접수 당시 `retentionPolicyVersion`을 저장하고, 강좌 종강/정규 등록 안내 또는 설명회 종료/안내 완료 때 관리자가 `purgeEligibleAt`을 설정한다. 자동 파기는 기본 해제이며, 켜진 경우에만 이 시각이 지난 기록을 비식별화/파기한다. // ASM-009

## SEO·자산

각 유지 경로는 `generateMetadata`로 title, description, canonical, OG를 계약화한다. 관찰된 title은 `legacy-seo-map.md`를 기준으로 하고 미관찰 메타는 새 canonical과 페이지 설명을 설정한다. 308은 서버에서 수행한다. `legacy-assets-raw/`의 공개 자산은 권리가 `미확인(D6)`이므로 저장소에 커밋하지 않으며, 권리 확인 뒤에만 이미지 메타데이터·크기·AVIF/WebP 변환본을 생성하여 `next/image`로 제공한다.

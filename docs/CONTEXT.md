# MUNSAYU V2 — 작업 컨텍스트 (세션 시작 시 이 파일만 읽는다)

> 갱신 규칙: 작업이 끝날 때마다 **이 파일만** 갱신한다. 상세는 각 보고서·ADR에 남긴다.
> 마지막 갱신 2026-11-14 · 규약은 `CLAUDE.md`, 설계는 `docs/BLUEPRINT.md`, 계획·Gate는 `docs/MIGRATION_PLAN.md`.

## 1. 프로젝트와 현재 상태

- 원본 `https://munsayu.com` (PHP) → 목표 Next.js 16 App Router + TS strict + Prisma/PostgreSQL. PHP 소스·DB 접근 불가, **블랙박스 마이그레이션**(관찰된 HTML·JS·HTTP·흐름 근거로 재구현).
- 현재 Phase **5 — Legacy Parity Testing / `GATE_CHECK`** (Gate 4/5 충족, 2번은 방법 대체 — 사람 판단 필요). 보고서 `docs/reports/phase-5-report.md`.
- 브랜치 `feat/admin-media` — AD-015 관리자 이미지 관리(ADR-008) 구현분 + Phase 5 선행 수정. Phase 0~4 승인·병합 완료.
- Phase 5 0단계(선행 수정) **완료**(2026-11-14). 1단계 레거시 동등성 검증 **대부분 완료** — 보고서 `docs/reports/legacy-parity-report.md`, 근거 `docs/evidence/parity/EV-0015-phase5-parity.md`.
- 1단계 결과: 버그 12건 고침 · 의도된 변경 7건 · 원장님 질문 6건(`Q-ADM-15`~`20`) · 시드 데이터 차이 4건. 내부 링크 404 0, 절대 주소 0, 깨진 이미지 0.
- **메인 화면 원본 HTML 반영 완료** — 배너 슬라이드 2·3, 「4대 차별화 시스템」 섹션, PROJECT COSMO 문구를 레거시 관찰값으로 복원.
- **남은 비교 완료**(2026-11-14): 레거시의 접혀 있던 탭도 본문이 HTML 에 모두 있었다. `/sub/Facility`·`/sub/Location` 분당점 탭과 `/sub/about` 3번 탭을 관찰값으로 채웠다.
- 독립 리뷰 완료: 차단 1 수정(숨은 배너 슬라이드가 클릭·초점을 가로챔) · 권장 5 중 3 수정 — `docs/reports/phase-5-review.md`.
- Phase 5 남은 일: 사람 승인. (Gate 2번 기준을 방법 대체로 인정할지 판단 필요 — `phase-5-report.md` Gate 절)
- 해소: ASM-040(주 메뉴) · ASM-081(분당 시설 카드) · ASM-049(분당 오시는 길) · ASM-048(부분). 어긋남: ASM-043(`/sub/abouttch3` 은 컨설팅팀 강사진). 신규: ASM-095(화면별 SEO)·ASM-096(`/sub/about` 상담 폼 보류).
- 원장님 답 대기 6건: `Q-ADM-15`~`20` (구글 폼 주소 2종·상담 폼 복원·abouttch3 내용·상담 시간 2종·설명회 학년·화면별 SEO).
- 사람 승인 없이 다음 Phase로 넘어가지 않는다. `docs/PHASE.md`의 승인 칸·결정 내용은 사람만 채운다.

## 2. 확정 결정 (D = `docs/PHASE.md` 결정표, ADR = `docs/decisions/`)

| # | 결정 |
|---|---|
| D1 | 원본 사진·서버 백업 확보 불가 → 레거시 데이터 이관 없음 (ADR-003) |
| D2 | PostgreSQL + Prisma 신규 구축 (ADR-003) |
| D3 | 배포는 Vercel 전제, DB·이미지 저장소는 어댑터 분리 — 기본안 ASM-008 (ADR-003) |
| D4 | 문자 발송 없음. 계정 기능용 메일만 (MailAdapter + console/Resend) (ADR-004) |
| D5 | 단일 관리자 역할, 관리자가 계정 추가·삭제 (ADR-003) |
| D6 | 레거시 이미지는 학원 귀속, 폰트는 라이선스 확인 전 대체 (ADR-004) |
| D7·D8 | 도메인·DNS 권한, 전환 일정 — **미정** (Phase 7 전) |
| D9 | 설명회: 수동 상태 전환, 정원 미강제, 1건 최대 2명, 의도적 재신청 허용 (ADR-004) |
| ADR-002 | Phase 1 Gate의 관찰 가능 범위 |
| ADR-005 | 인증 설계와 비밀번호 해시(argon2id) |
| ADR-006 | 공지 본문 편집기와 HTML 정리기(sanitize-html) |
| ADR-007 | Phase 5 관리자 범위 변경 — AD-009·AD-011·AD-014 포함 |
| ADR-008 | 관리자 이미지 업로드·보관함, 삭제와 「숨기기」 (AD-015) |

## 3. 유효한 ASM (전문·근거는 `docs/reports/open-questions.md`)

- ASM-001 설명회 상태 3종을 관리자가 수동 전환, 정원 미강제, 1건 최대 2명
- ASM-002 회원은 가입·로그인·찾기·수정·탈퇴, 신청은 비회원도 가능
- ASM-003 강사는 여러 팀 소속 가능, 팀별 노출 순서를 둔다
- ASM-004 자체 접속자 집계 없음, 분석 ID 환경 변수만
- ASM-005 설명회 관리 코드는 자동 생성 + 관리자 수정 가능
- ASM-006 CSV는 현재 필터 결과 전체를 내보내고 다운로드를 기록
- ASM-008 Vercel 전제, DB·이미지 저장소는 어댑터로 분리
- ASM-009 설명회 개인정보 보존 기준은 강좌와 동일, 파기 시각은 관리자 설정
- ASM-010 메일은 기본 console 어댑터, Resend는 환경 변수로 선택
- ASM-011 레거시 폰트 대신 오픈 라이선스 대체 폰트
- ASM-012 로컬·테스트 DB는 `.tmp/pgdata` PostgreSQL 16 (포트 55433), CI는 `postgres:16`
- ASM-013 `/sub/Check`는 이름·연락처로 강좌·설명회를 함께 보여 주고 건별 취소
- ASM-014 비밀번호는 argon2id로 저장
- ASM-016 Unsplash 9칸은 같은 사진을 로컬 제공, 삭제된 1칸은 CSS 대체
- ASM-017 1MB 초과 레거시 이미지는 긴 변 2000px로 줄여 커밋
- ASM-021 console 메일은 운영에서 제목·가린 수신자만 기록
- ASM-022 요청 횟수 제한은 메모리 카운터 60회/60초
- ASM-023 메일 링크 기준 주소는 `APP_BASE_URL` (기본 `http://localhost:3000`)
- ASM-025 관리자 입력은 공유 계약 `src/lib/contracts/admin.ts`
- ASM-040 주 메뉴 하위 항목은 관찰된 공개 경로로 채움
- ASM-041 시스템 글꼴 묶음만 사용
- ASM-043 `/sub/abouttch2`는 분당 강사진, `/sub/abouttch3`은 문해력 진단 안내
- ASM-044 강좌·설명회 상세보기는 카드 안에서 펼침
- ASM-046 홈 히어로 제목을 `h1`으로 올림
- ASM-048 학원 소개 2번 탭 PROJECT COSMO 확인, 3번 탭은 상담 절차·학원 안내까지 반영(폼은 ASM-096)
- ASM-050 오시는 길에 지도 iframe 없이 링크만
- ASM-051 강사 카드의 수강 예약 링크를 항상 노출
- ASM-052 설명회 동의 문구는 강좌 문구에서 목적·항목·보유기간만 변경
- ASM-053 예약 확인 주의사항 5개는 레거시 문구 그대로
- ASM-054 공지 목록에 검색 없음
- ASM-055 회원가입 2단계·정보 수정은 계약 스키마만 따름
- ASM-056 회원가입 약관 상자는 레거시 문구 그대로
- ASM-070 공지 작성자 칸은 `문사유` 고정
- ASM-071 지점 미지정 설명회는 `지점 공통 / 온라인` 묶음
- ASM-072 강사 약력은 줄바꿈을 항목 구분으로 보고 목록화
- ASM-073 공개 헤더는 로그인·회원가입만, 로그인 상태 미표시
- ASM-075 화면은 지점 **이름**으로 DB 지점을 찾음
- ASM-077 분석 스크립트 형식은 GA4(gtag.js) 가정
- ASM-078 관리자 계정 묶음은 `role === "ADMIN"`으로 추림
- ASM-079 `/sub/Facility` 「책과 글을 위한 교실」은 CSS 배경
- ASM-080 사진 없는 강사 자리에 학원 로고
- ASM-082 문해력 진단 버튼은 `AppSetting.diagnosis.cta.externalUrl`의 구글 폼으로 이동
- ASM-083 상담 유형 기본값 `COSMO 스펙트럼 진단평가 예약`·`일반 상담`
- ASM-084 상담 학생 학년은 예비초~초6
- ASM-085 강사 지원 서류는 PDF·DOCX·HWP·HWPX, 기본 10MB, **파일 내용으로** 형식 확인
- ASM-086 알림 신청은 개인정보·수신 동의를 따로 받고 문자 발송은 없음
- ASM-087 강사 지원 상태 기본값 `접수`·`검토중`·`완료`
- ASM-088 `/sub/Recruit`는 설정을 켜면 푸터 RESERVE 묶음에만 노출
- ASM-089 게시판은 공지사항 하나만 (그누보드 설정 미이관)
- ASM-090 레거시 공지 가져오기는 개인정보로 보이는 글을 건너뛰고 번호만 보고
- ASM-091 HEIC 변환은 시도만 하고 HEVC는 안내로 반환, AVIF 기반 HEIF는 변환됨
- ASM-092 자동 배너는 첫 슬라이드만 보조기기에 읽힘
- ASM-093 시설 공간 카드 4칸은 코드 고정, 관리자 교체는 지점 갤러리로 한정
- ASM-094 다중 프레임 GIF는 전체를 저장하되 한 장 높이 계산에 자동 검증 없음
- ASM-095 공개 화면 title·description·canonical·og 는 화면별로 다르게 (레거시는 전 화면 동일)
- ASM-096 `/sub/about` 상담·진단 신청 폼은 사용자 재확인 전까지 되살리지 않음

해소·무효: ASM-040·049·081(EV-0015 관찰값으로 교체) · ASM-007(AD-010·AD-011 범위 포함) · 015(AD-014 구현) · 020 · 024(→025) · 047(AD-010 구현) · 058 · 074 · 076.

## 4. 기능 ID 상태 (전부 구현·테스트 통과. 동등성 확인만 Phase 5에 남음 — `docs/reports/migration-status.md`)

| 구분 | ID | 비고 |
|---|---|---|
| PG 14/14 | 001 홈 · 002 about · 003 Location · 004 Facility · 005~007 abouttch1~3 · 008 schedule.n · 009 schedule.g · 010 Presentation · 011 Check · 012 notice · 013 login · 014 register | `app/(public)/**` |
| FM 3/3 | 001 강좌 신청 · 002 설명회 예약(신규 설계) · 003 회원 lifecycle | `src/server/services/*applications*, accounts.ts` |
| BZ 2/2 | 001 마감 상태 신청 차단 · 002 개인정보 보유 문구·파기 연동 | `services/courses.ts, events.ts, privacy.ts` |
| AD 15/15 | 001 로그인 · 002 회원·관리자 계정 · 003 설명회 · 004 상태 전환 · 005 예약자 집계 · 006 강사·팀 · 007 강좌 · 008 강좌 신청 · 009 상담 · 010 알림 신청 · 011 강사 지원 · 012 분석 ID 자리 · 013 개인정보·CSV·파기 · 014 공지 · 015 이미지 관리(올리기·교체·삭제·숨기기) | `app/admin/(authed)/**` |
| RT 4/4 | 001 공지 308 · 002 인증 308 · 003 외부 진단 링크 · 004 `/uAdmin`·`/adm` 410 | `proxy.ts` |

## 5. 폴더 구조 (요약)

```
app/(public)/**          공개 화면        app/admin/(authed)/**  관리자 화면       app/api/**  Route Handler
src/components/{home,public,admin,account,layout,ui}/   src/lib/{contracts,actions,data}/  공유 Zod·Server Action
src/server/{services,adapters,auth,lib}/  db.ts         prisma/{schema.prisma,migrations,seed.ts}
tests/{unit,integration,e2e,visual}/      docs/{contracts,decisions,reports,evidence,legacy,photo}/
```

## 6. 자주 쓰는 명령

| 목적 | 명령 |
|---|---|
| DB 켜기·끄기 | `npm run db:start` / `npm run db:stop` (포트 55433) |
| 마이그레이션·시드 | `npm run db:deploy` · `npm run db:seed` · `npm run db:reset` |
| 개발 서버 | `npm run dev` (http://localhost:3000, 관리자 `/admin/login`) |
| 빠른 검사 | `npm run check` (typecheck + lint + 변경분 단위 테스트) |
| 단위·통합 | `npm run test:unit` · `npm run test:integration` |
| 기능별 통합 | `npm run test:feature -- ad-015` (파일명 일부, 예: `fm-001`, `pg-012`) |
| E2E | `npm run e2e` |
| 시각 회귀 전체 / 한 화면 | `npm run e2e:visual` / `npm run e2e:visual:page -- PG-001` |
| 전체 검증 | `npm run verify:all` (assets + check + 전체 테스트 + E2E + 시각 회귀) |
| 로그인 잠금 풀기(로컬 전용) | `npm run db:unlock` · `npm run db:unlock -- <아이디>` |
| 보조 | `npm run check:assets` · `npm run build:media-registry` · `npm run import:notices -- --dry-run` |

통합·E2E 테스트는 DB가 켜져 있어야 한다. 환경 변수 키 이름과 첫 관리자 계정 만드는 방법은 `docs/LOCAL_DEV.md`.

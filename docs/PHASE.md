# MUNSAYU V2 — Phase 진행 상태판

> 이 파일은 **현재 어디까지 왔는지**를 보여주는 단일 기준입니다.
> - Claude Code는 세션을 시작할 때 이 파일을 가장 먼저 읽고, 여기 적힌 "현재 Phase"만 작업합니다.
> - Phase가 끝나면 Claude가 이 파일을 갱신합니다. **승인 칸은 사람만 채웁니다.**
> - Gate 기준의 원본은 `docs/MIGRATION_PLAN.md` 6장입니다. 여기에는 결과만 적습니다.

---

## 현재 상태

| 항목 | 값 |
|---|---|
| 현재 Phase | **5 — Legacy Parity Testing** |
| 상태 | `NOT_STARTED` |
| 마지막 갱신 | 2026-11-12 |
| 다음 행동 | Phase 5 시작 시 아래 **Phase 5 이월 항목**을 가장 먼저 처리 |
| 막힌 것 | 없음 — 남은 의문은 ASM으로 기록하고 Phase 안에서 진행 |

상태 값: `NOT_STARTED` → `IN_PROGRESS` → `GATE_CHECK` → `IN_REVIEW` → `APPROVED`
(Gate 실패 시 `GATE_FAIL` → 수정 후 다시 `GATE_CHECK`)

---

## Phase 진행표

| # | Phase | 상태 | Gate | 독립 리뷰 | 사람 승인 | 보고서 |
|---|---|---|---|---|---|---|
| 0 | Harness Bootstrap | APPROVED | PASS (7/7) | 차단 0 / 권장 2 | ☑ | `reports/phase-0-report.md` |
| 1 | PHP Black-Box Reconnaissance | APPROVED | PASS (6/6) | 차단 0 / 권장 0 | ☑ | `reports/phase-1-report.md` |
| 2 | Migration Contract | APPROVED | PASS (7/7) | 차단 3 수정 / 권장 반영 | ☑ | `reports/phase-2-report.md` |
| 3 | Frontend Reconstruction | APPROVED | PASS (5/5) | 차단 1 수정 / 권장 12 기록 | ☑ | `reports/phase-3-report.md` |
| 4 | Backend Replacement | APPROVED | PASS (9/9 적용) | 차단 1 수정 / 권장 12 기록 | ☑ | `reports/phase-4-report.md` |
| 5 | Legacy Parity Testing | NOT_STARTED | — | — | ☐ | `reports/phase-5-report.md` |
| 6 | Performance & Security | NOT_STARTED | — | — | ☐ | `reports/phase-6-report.md` |
| 7 | Cutover 준비 | NOT_STARTED | — | — | ☐ | `reports/phase-7-report.md` |

- Gate 칸: `PASS (n/n)` 또는 `FAIL (통과 수/전체)`
- 독립 리뷰 칸: `차단 0 / 권장 n` 형식
- 3·4는 병렬 진행하고, 두 Phase의 Gate·독립 리뷰·보고를 마친 뒤 한 번만 사람 승인을 받습니다.

---

## Phase 5 이월 항목

Phase 3·4 승인 시 사용자가 지정한 보완 사항입니다. **Phase 5를 시작하면 가장 먼저 처리합니다.**

| 항목 | 내용 |
|---|---|
| ~~로컬 실행 안내~~ **완료** | `docs/LOCAL_DEV.md` 작성 — Docker·`.env` 키 이름, DB 실행 → 마이그레이션 → 시드 → 개발 서버 명령, 관리자 주소와 첫 관리자 계정 만드는 방법(값은 쓰지 않음), 회원·관리자 로그인 위치 |
| 메인 원본 HTML 반영 **미착수** | 사용자 저장본이 없어 Phase 5 동등성 검증과 함께 한다. `docs/legacy/source/home/`의 사용자 저장본(없으면 Phase 1 DOM 증거 + 공개 CSS GET) 기준으로 메인 화면 구조·문구·스타일을 맞춘다. 상담 시간 두 가지와 `/sub/abouttch3` 링크는 원장님께 질문으로 남긴다 |
| ~~AD-010 설명회 알림 신청~~ **완료** | **범위 포함으로 결정**(사용자, 2026-11-12). 메인 하단 폼(학년·학생 이름·학교명·보호자 연락처, 레거시 `POST ./sms_subscribe.ajax.php`) + 개인정보·알림 수신 동의 신규 + 관리자 문자신청내역 목록·CSV. **문자 발송은 없다** |

- 이 표의 항목은 Phase 5 보고서에서 처리 결과를 적습니다. 처리 결과는 `reports/phase-5-report.md`에 있습니다.
- AD-010은 구현을 마쳤고 `migration-matrix.md`·`migration-status.md`도 갱신했습니다.
- 사용자 지시(2026-11-12)로 추가된 AD-009·AD-011·AD-014는 구현을 마쳤습니다. 범위 변경 근거는 `decisions/ADR-007-phase5-admin-scope-change.md`입니다.

---

## 도구 연결 상태

Phase 0에서 Claude가 채웁니다. 필수 도구가 `정상`이 아니면 Phase 1·5는 시작할 수 없습니다. 기준은 `docs/TOOLING.md`입니다.

| 도구 | 구분 | 상태 | 버전 | 확인일 | 비고 |
|---|---|---|---|---|---|
| REA MCP | 필수 | 정상 | rea-agents 6.8.0 / MCP server 2.3.1 / 229 tools | 2026-11-06 | Chrome 156 CDP 및 localhost `inspect_web_page` 확인; project-scope doctor 통과 |
| Playwright MCP | 필수 | 정상 | `mcp__playwright__*` 24 tools | 2026-11-06 | 활성 세션 도구 목록 확인 |
| Playwright Test | 필수 | 정상 | @playwright/test 1.58.2 / Chromium 158.0.8127.18 | 2026-11-06 | 브라우저 설치 및 샘플 E2E 통과 |
| Chrome DevTools MCP | 권장 | 미설치 | — | 2026-11-06 | 활성 도구 목록에 없음 |
| Next.js DevTools MCP | 권장 | 미설치 | — | 2026-11-06 | 활성 도구 목록에 없음 |
| Context7 | 권장 | 미설치 | — | 2026-11-06 | 활성 도구 목록에 없음 |

상태 값: `정상` / `오류` / `미설치` / `미확인`

---

## 결정 사항 현황

`MIGRATION_PLAN.md` 3장의 결정 목록입니다. Claude는 **선택지와 추천안만** 적고, 결정은 사람이 합니다.

| # | 결정 사항 | 필요 시점 | 상태 | 결정 내용 | ADR |
|---|---|---|---|---|---|
| D1 | 원본 사진·서버 백업 확보 가능 여부 | Phase 2 | 확정 | 확보 불가, 레거시 데이터 이관 없음 | ADR-003 |
| D2 | DB (PostgreSQL 신규 / MySQL 연결) | Phase 2 | 확정 | PostgreSQL + Prisma 신규 구축 | ADR-003 |
| D3 | 배포 환경 | Phase 2 | 기본안(ASM-008) | Vercel 전제, DB·이미지 저장소는 어댑터 분리 | ADR-003 |
| D4 | 문자·메일 공급사 | Phase 2 | 확정 | 문자 발송 없음, 계정 기능용 메일만; MailAdapter + console/Resend | ADR-004 |
| D5 | 관리자 계정·권한 | Phase 2 | 확정 | 단일 관리자 역할, 관리자가 계정 추가·삭제 | ADR-003 |
| D6 | 이미지·폰트 사용 권리 | Phase 3 전 | 부분 확정 | 레거시 이미지는 학원 귀속, 폰트는 라이선스 확인 전 대체 | ADR-004 |
| D7 | 도메인·DNS 관리 권한 | Phase 7 전 | 미정 | | |
| D8 | 전환 일정 | Phase 7 | 미정 | | |
| D9 | 설명회 규칙(정원·참석 인원 상한·마감·중복·필수 항목) | Phase 2 | 확정 | 수동 상태 전환, 정원 미강제, 1건 최대 2명, 의도적 재신청 허용 | ADR-004 |

미정 사항은 Phase 안에서 ASM 기본안으로 설계·기록합니다. 다음 Phase 시작은 사람 승인 전에는 할 수 없습니다.

---

## 운영자 확인 질문 (Phase 1 이후)

`docs/legacy/legacy-unknowns.md`에서 운영자(원장님·실무자)의 답이 필요한 질문만 여기로 옮깁니다.

| ID | 질문 | 관련 기능 | 답변 | 답변일 |
|---|---|---|---|---|
| — | (Phase 1에서 Claude가 채움) | | | |
| Q-ADM-01 | 홈페이지 회원가입을 받는 이유가 있나요? 지금 회원이 관리자 1명뿐인데, 새 사이트에서는 회원가입 없이 관리자 로그인만 두어도 될까요? | AD-002 | 회원가입 유지, AD-002 이관 확정 | 2026-11-11 |
| Q-ADM-02 | 설명회 상태는 어떤 것들이 있나요? (접수중·마감임박·접수마감 외) 직접 바꾸나요, 인원이 차면 자동으로 바뀌나요? | AD-004 | 사용자 답변(2026-11-09): 레거시 폼 없이 신규 설계. 상태·마감 방식은 D9에서 확정 | 2026-11-09 |
| Q-ADM-03 | 설명회마다 정원이 있나요? 한 번 예약할 때 여러 명(예: 부모 2명)이 함께 신청할 수 있나요? | AD-003~005 | 사용자 답변(2026-11-09): 신규 설계. 정원·참석 인원 상한은 D9에서 확정 | 2026-11-09 |
| Q-ADM-04 | 같은 선생님이 대치팀·분당팀에 따로 등록돼 있는데, 지점마다 약력이나 사진이 다르게 보여야 하나요? | AD-006 | | |
| Q-ADM-05 | 강좌 신청이 들어오면 어떻게 처리하나요? 강좌별 정원이 있나요? | AD-007~008 | 정원 자동 마감 없음; 관리자가 강좌별 접수중/마감을 직접 변경 | 2026-11-11 |
| Q-ADM-06 | 접속자집계는 지금 실제로 보시나요? 새 사이트에서 방문 통계 도구(GA4 등)로 대체해도 될까요? | AD-012 | | |
| Q-ADM-07 | 입학진단관리, 문자신청내역, 강사지원관리는 각각 어떤 일을 하는 메뉴인가요? (화면 스크린샷 요청) | AD-009~011 | 사용자 답변(2026-11-09): AD-009는 Google Forms 외부 링크 유지(구현 없음). AD-010·011만 화면 확인 필요 | 2026-11-09 |
| Q-ADM-08 | 관리코드(예: 2026D5)는 어디에 쓰이나요? 직원이 정하는 규칙이 있나요? | AD-003 | | |
| Q-ADM-09 | 관리자 화면에서 매일·매주 하는 일은 무엇인가요? | AD-001~013 | | |
| Q-ADM-10 | 관리자 계정은 몇 명이고, 사람마다 볼 수 있는 범위가 달라야 하나요? | AD-001 | 역할 구분 없음; 단일 관리자, 관리자가 계정 추가·삭제 | 2026-11-11 |
| Q-ADM-11 | 지금 쓰는 문자·메일 발송 업체와 발송 시점(신청 즉시, 하루 전 등)은? | AD-010 | 사용자 답변(2026-11-09): 강좌 예약 후 학부모 연락은 직원이 직접 처리, 구현하지 않음. 직원 신규 신청 알림은 UNKNOWN | 2026-11-09 |
| Q-ADM-12 | 신청자 개인정보는 얼마나 보관하고 언제 지우나요? | AD-013 | 관리자 설정으로 변경; 기본은 EV-0006 동의 문구, 자동 파기 기본 꺼짐 | 2026-11-11 |
| Q-ADM-13 | 신청 내역을 엑셀로 내려받아 쓰나요? 어떤 항목이 필요한가요? | AD-003~005, AD-008, AD-013 | 필터 결과 전체 CSV, 개인정보 다운로드 기록 유지 | 2026-11-11 |
| Q-ADM-14 | 지금 관리자 화면에서 불편하거나 꼭 바뀌었으면 하는 점은? (답은 기록하되, 레거시에 없는 기능은 Phase 2에서 사용자가 따로 승인한다) | AD-001~013 | | |

---

## 기능 이관 요약 (Phase 2 이후)

세부 내용은 `docs/reports/migration-status.md`에 있습니다. 여기에는 숫자만 적습니다.

| 구분 | 전체 | 구현 | 테스트 통과 | 동등성 확인 |
|---|---|---|---|---|
| PG 페이지 | 14 | 14 | 14 | Phase 5 |
| FM 폼 | 3 | 3 | 3 | Phase 5 |
| BZ 비즈니스 규칙 | 2 | 2 | 2 | Phase 5 |
| AD 관리자 | 14 | 14 (AD-014 신설 포함) | 14 | Phase 5 |
| RT 레거시 URL | 4 | 4 | 4 | Phase 5 |

---

## 변경 이력

Claude는 Phase 상태가 바뀔 때마다 한 줄씩 추가합니다. 위쪽이 최신입니다.

| 날짜 | Phase | 변경 | 작성 |
|---|---|---|---|
| 2026-11-12 | 3·4→5 | Phase 3·4 승인, PR #4 squash 병합 (사용자 지시). 보완 3건은 Phase 5로 이월 | Claude Code |
| 2026-11-12 | 3·4 | PR #4 생성, CI verify 통과. GitGuardian은 과거 커밋의 테스트 가짜 비밀번호로 빨간불 — 사람 판단 필요 | Claude Code |
| 2026-11-12 | 3·4 | 독립 리뷰 차단 2건(BZ-002 보유기간 문구 연결, ASM 등록부 누락) 수정, Gate PASS로 GATE_CHECK 전환 | Claude Code |
| 2026-11-12 | 3·4 | C-3 통합: FE·BE 병합, 전체 E2E 39건, 통합에서 찾은 결함 5건 수정 | Claude Code |
| 2026-11-11 | 3·4 | 레거시 이미지 57개 수집·연결, 1MB 초과 축소, Unsplash 6종 로컬화 (사용자 지시) | Claude Code |
| 2026-11-11 | 3·4 | C-1 공유 계약 확정(Zod 전체·예약 조회 목록 계약), Prisma 7 설정·로컬/CI DB·테스트 하네스 정비, ASM-012~015 기록 | Claude Code |
| 2026-11-11 | 2→3·4 | Phase 2 승인, PR #3 병합 (사용자 지시) | Codex |
| 2026-11-11 | 2 | Gate PASS(7/7), 독립 리뷰 차단 3건 수정 후 GATE_CHECK로 전환 | Codex |
| 2026-11-11 | 2 | Phase 2 시작: 확정 답변 및 ASM 기본안 반영, 상태를 IN_PROGRESS로 변경 | Codex |
| 2026-11-09 | 1 | Phase 1 승인, PR #2 병합 (사용자 지시) | Codex |
| 2026-11-09 | 1 | Phase 1 리뷰 반영: .gitignore·AD 연결·공개 사업자 정보 예외 처리 | Codex |
| 2026-11-09 | 1 | 독립 리뷰 완료: 차단 1 / 권장 2, 상태를 IN_REVIEW로 변경 | Codex |
| 2026-11-09 | 1 | 게시판·인증·예약조회 REA 대표 증거 완료, Gate PASS(6/6)로 GATE_CHECK | Codex |
| 2026-11-09 | 1 | 강좌 예약 POST 주소·전송 항목 확인, REA Gate 기준을 주소 형식별 대표로 조정 | Codex |
| 2026-11-09 | 1 | Gate 재판정: REA 전수 증거·번들 분석 미완료로 GATE_FAIL | Codex |
| 2026-11-09 | 1 | 3-5 완료: 공개 자산·강사 대표 정보 정리, 권리 미확인 raw 자산은 미수집 | Codex |
| 2026-11-09 | 1 | 3-4 완료: 강좌 예약 DOM 계약 확인, 번들 분석 시간 제한은 UNKNOWN으로 기록 | Codex |
| 2026-11-09 | 1 | 3-2 완료: 공개 페이지 형식별 1440/390·DOM 증거 보강 | Codex |
| 2026-11-09 | 1 | 3-1 완료: 내부 메뉴·푸터 반복 링크 포화 확인, 관리자 경로 미접속 | Codex |
| 2026-11-09 | 1 | 사용자 답변 반영 및 보정 Gate 기준 재조사 시작 | Codex |
| 2026-11-09 | 1 | 1-F 완료: 기능 매트릭스·UNKNOWN·자산·SEO 문서화, Gate FAIL 보고서 작성 | Codex |
| 2026-11-09 | 1 | 1-D 완료: 관찰 자산·SEO 정리 (Chrome DevTools MCP 미설치로 1-E 건너뜀) | Codex |
| 2026-11-09 | 1 | 1-C 완료: 대표 폼·스크립트·네트워크 관찰, 운영 사이트 쓰기 요청 0건 | Codex |
| 2026-11-09 | 1 | 1-B 완료: 대표 공개 화면 스크린샷·DOM·REA 증거 수집, 관리자 AD-* 연결 | Codex |
| 2026-11-09 | 1 | 1-A 완료: 공개 경로 14개, 상세·인증 URL 형식 3개 기록; sitemap.xml 404 | Codex |
| 2026-11-09 | 1 | 1-B 재개: 공개된 사업자·개인정보관리책임자 정보는 사용자 확인으로 증거 보관 허용 | Codex |
| 2026-11-09 | 1 | 1-B 중단: 설명회 공개 화면에서 개인정보 노출 확인, 원본 증거 파일 폐기 | Codex |
| 2026-11-09 | 1 | 1-A 초안: 공개 경로 14개 수집, robots 금지 경로 제외 | Codex |
| 2026-11-09 | 1 | Phase 1 재개: Chrome CDP·robots.txt 확인, 공개 조사 시작 | Codex |
| 2026-11-09 | 1 | 범위 보강: 백엔드·관리자 기능 확정, 관리자 화면 EV-ADM-01~07 반영 (사용자 지시) | Codex |
| 2026-11-06 | 1 | 사용자 제공 관리자 화면 근거(EV-ADM-01~07) 및 조사 항목 반영 | Codex |
| 2026-11-06 | 1 | 범위 보강: 백엔드·관리자 기능 확정 (사용자 지시) | Codex |
| 2026-11-06 | 0 | Phase 0 승인, PR #1 병합 (사용자 지시) | Codex |
| 2026-11-06 | 0 | 독립 리뷰 완료: 차단 0 / 권장 2, 상태를 IN_REVIEW로 변경 | Codex |
| 2026-11-06 | 0 | Gate PASS (7/7), 상태를 GATE_CHECK로 변경 | Claude Code |
| 2026-11-06 | 0 | 하네스 구현 및 Gate 재검증 완료 | Claude Code |
| 2026-11-06 | 0 | Phase 0 재개 (Claude Code) — 상태를 IN_PROGRESS로 변경 | Claude Code |
| 2026-11-06 | 0 | 재검증도 FAIL: REA CDP endpoint 및 Playwright MCP 미연결 지속 | Codex |
| 2026-11-06 | 0 | 상태를 IN_PROGRESS로 변경, Gate FAIL 항목 재검증 시작 | Codex |
| 2026-11-06 | 0 | Gate FAIL: REA CDP endpoint 및 Playwright MCP 미연결 | Codex |
| 2026-11-06 | 0 | 상태를 IN_PROGRESS로 변경, 하네스 검증 시작 | Codex |
| — | 0 | 상태판 생성 | 사람 |

---

## Claude 갱신 규칙

1. 세션 시작 시: 이 파일 → `CLAUDE.md` → `BLUEPRINT.md` → `MIGRATION_PLAN.md` → `TOOLING.md` 순서로 읽습니다.
2. 작업 시작 시: 상태를 `IN_PROGRESS`로 바꾸고 변경 이력에 한 줄 추가합니다.
3. 작업 종료 시: Gate를 확인하고 결과를 표에 적은 뒤 상태를 `GATE_CHECK` 또는 `GATE_FAIL`로 바꿉니다.
4. Gate 확인 뒤 독립 리뷰를 수행하고 차단 항목을 같은 Phase에서 수정합니다. 보고 완료 시 상태를 `GATE_CHECK`로 바꾸고 **멈춥니다.**
5. `사람 승인` 칸과 `APPROVED` 상태, 결정 사항의 `결정 내용`은 Claude가 스스로 채우지 않습니다. 사람이 직접 고치거나, 승인 프롬프트(`EXECUTION_PROMPTS.md`)로 명시적으로 지시한 경우에만 기록합니다.
6. 사람이 승인하면 "현재 Phase"를 다음 번호로 바꾸고 `NOT_STARTED`로 시작합니다.

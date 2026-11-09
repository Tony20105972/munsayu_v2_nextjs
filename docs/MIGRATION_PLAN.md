# MUNSAYU V2 — PHP → Next.js 풀스택 마이그레이션 실행 계획

작성: 2026-11 · 대상: munsayu.com · 도구: Claude Code × Codex × **REA × Playwright** (보조 도구는 `TOOLING.md`)

---

## 1. 목표와 범위

### 목표
기존 PHP 기반 munsayu.com의 **프론트엔드와 백엔드 전체**를 Next.js + TypeScript로 옮긴다.
화면만 React로 바꾸고 뒤에 PHP가 남는 반쪽 전환이 아니라, 페이지 구조·폼 처리·서버 비즈니스 로직·예약 기능까지 신규 환경에서 재구현한다.

### 범위
- 공개 페이지: 메인, 강사진, 시간표, 설명회, 지점, 예약 등 Phase 1에서 확인되는 전체
- 신청·예약: 상담·설명회·예약 폼 처리, 정원·마감·상태 전환
- 관리자: BLUEPRINT 4.3에 따라 AD-001·AD-003~AD-008을 이관하고, AD-013 개인정보 조회·다운로드 기록 및 보존 기간 경과 후 파기를 신규 필수로 한다. AD-002·AD-012는 운영자 답변, AD-009~AD-011과 공지·팝업 등 그 밖의 콘텐츠 수정 기능은 화면·운영자 확인 후 범위를 확정한다. 신청자 목록 CSV 다운로드와 개인정보 조회는 권한 있는 역할만 수행하고 모두 기록한다.
- 레거시 URL 호환, SEO 보존, 알림(문자·메일) 연동

### 범위 밖 (별도 결정 전까지)
- 기존 PHP 서버·DB의 수정
- 과거 신청·예약 데이터 복구 (데이터를 확보하면 Phase 7에서 별도 진행)
- 신규 기능 추가 (전환 완료 후 별도 계획)

---

## 2. 전제와 제약

| 항목 | 내용 | 영향 |
|---|---|---|
| PHP 소스 | 접근 불가 | 서버 로직은 관찰·추론으로 재구현. `INFERRED` 항목이 생김 |
| 기존 DB | 접근 불가 (현재 기준) | 스키마 신규 설계. 과거 데이터 자동 이관 불가 |
| 폼 제출 | 운영 사이트에 실제 제출 금지 | 제출 후 서버 동작은 대부분 `INFERRED` → 사용자 확인 필요 |
| 운영 사이트 | 읽기 전용으로만 관찰 | 비교 검증도 GET·화면 관찰로 한정 |

> **블랙박스 방식의 한계:** 폼을 제출해 보지 않으면 "정원 초과 시 어떻게 되는지", "관리자에게 어떤 알림이 가는지" 같은 서버 동작은 알 수 없습니다. 이 부분은 실제 운영자(원장님·실무자)의 설명이 가장 정확한 근거이므로, Phase 1 끝에서 질문 목록으로 정리해 답을 받는 절차를 넣었습니다.

---

## 3. 사전에 정해야 할 것

| # | 결정 사항 | 필요 시점 | 선택지 |
|---|---|---|---|
| D1 | 기존 데이터 확보 가능 여부 | Phase 2 | 호스팅사·기존 개발사에 DB 덤프 요청 / 불가 |
| D2 | DB | Phase 2 | PostgreSQL+Prisma 신규 (권장) / 기존 MySQL 연결 |
| D3 | 배포 환경 | Phase 2 | Vercel / 기타 호스팅 (DB 호스팅 포함 결정) |
| D4 | 문자·메일 발송 공급사 | Phase 2 | 기존 사용 중인 업체 확인 후 결정 |
| D5 | 관리자 계정·권한 구성 | Phase 2 | 역할(원장/실무자/강사 등) 정의 |
| D6 | 이미지·폰트 사용 권리 | Phase 3 전 | 강사 사진·유료 폰트 라이선스 확인 |
| D7 | 도메인·DNS 관리 권한 | Phase 7 전 | 등록 업체·담당자 확인 |
| D8 | 전환 일정 | Phase 7 | 신청이 적은 기간(설명회·입학 시즌 피하기) |

---

## 4. 최종 아키텍처

```
[Legacy] munsayu.com (PHP)  ── 관찰만 ──▶  Legacy Investigator
                                              REA: 페이지·스크립트·HAR 분석, 증거 ID
                                              Playwright: 탐색·스크린샷·HAR 기록
                                                    │  증거: REA evidence·스크린샷·HAR·DOM
                                                    ▼
                                    Migration Contract (docs/contracts/)
                         URL 매핑 · UI 명세 · API 계약(openapi) · DB 모델(Prisma)
                                                    │
                    ┌───────────────────────────────┴───────────────────────────┐
                    ▼                                                           ▼
      Frontend (Next.js App Router)                              Backend (같은 Next.js 앱)
      Server Components 기본                                     Route Handlers / Server Actions
      Client Components는 상호작용만                              TypeScript 서비스 계층
                    │                                                           │
                    └──────────────────────────┬────────────────────────────────┘
                                               ▼
                         PostgreSQL + Prisma  ·  Object Storage  ·  /admin (RBAC)
                         알림 어댑터(문자·메일)  ·  스케줄러(필요 시)
```

하나의 Next.js 앱 안에 프론트와 백엔드를 함께 두는 **모듈형 모놀리스**입니다.

---

## 5. PHP → Next.js 변환 규칙

| 기존 PHP | Next.js 전환 |
|---|---|
| PHP 템플릿·HTML | React Server Components |
| `include` 공통 헤더·푸터 | `layout.tsx` + 재사용 컴포넌트 |
| `.php` 경로·라우팅 | App Router + 308 리다이렉트 |
| 폼 제출·처리 | Server Actions(내부 폼) / Route Handlers(외부 호출) |
| PHP Session | 서버 측 인증·세션 (HttpOnly 쿠키) |
| MySQL 쿼리 | Prisma + PostgreSQL (D2 결정에 따름) |
| 관리자 페이지 | `/admin` + RBAC |
| 파일 업로드 | 검증된 업로드 API + Object Storage |
| 예약·비즈니스 로직 | `src/server/services/` TypeScript 서비스 |
| cron 작업 | 관리형 스케줄러 + 서버 작업 |
| 메일·문자 연동 | 알림 어댑터 인터페이스 |

---

## 6. Phase 계획과 Gate

각 Phase는 **보고서 작성 → 독립 리뷰 → 사용자 승인** 후에만 다음으로 넘어갑니다.

### Phase 0 — Harness Bootstrap
**목표:** 개발 환경과 규약을 갖춘다.
**작업:** 필수·권장 도구 연결(`TOOLING.md`), Next.js(16 이상)·Tailwind 프로젝트, 디렉터리 구조, 린트·테스트 설정, CI, 증거 원장 템플릿, `AGENTS.md`
**Gate**
- [ ] `typecheck`, `lint`, `test`, `e2e:smoke` 명령이 로컬에서 통과
- [ ] GitHub Actions CI가 PR에서 실행되고 통과
- [ ] `CLAUDE.md` 8장 디렉터리 구조 생성
- [ ] **REA:** `npx -y rea-agents@6.8.0 doctor --client codex --json`에서 `node`가 healthy이고 `claude_code`·`codex` 등록이 aligned, 웹 관찰 설정 완료, localhost 페이지로 `inspect_web_page` 동작 확인. REA 6.8.0의 Ghidra·IDA·jadx·Kuna 및 다른 앱 등록 경고는 이 Gate 범위 밖이다.
- [ ] **Playwright:** MCP 연결, Playwright Test 브라우저 설치, 샘플 E2E 통과
- [ ] 권장 도구 연결 상태와 모든 도구의 실제 버전·도구 이름을 보고서에 기록
- [ ] munsayu.com 접속 이력 없음

### Phase 1 — PHP Black-Box Reconnaissance
**목표:** 레거시 사이트의 관찰 가능한 모든 동작을 증거와 함께 기록한다.
**추가 조사:** 그누보드 형식 공개 경로(`/bbs/` 등)와 강좌 수강 신청 폼을 확인한다. 관리자 경로(`/adm/` 등)는 접속 금지다.
**산출물:** `legacy-route-map.json`, `legacy-feature-matrix.md`, `legacy-form-contracts.md`, `legacy-assets.json`, `legacy-seo-map.md`, `legacy-unknowns.md`
**Gate**
- [ ] 내비게이션·푸터·sitemap에서 도달 가능한 공개 URL 전부가 route map에 있음
- [ ] 모든 공개 페이지에 데스크톱·모바일 스크린샷 존재
- [ ] 모든 폼의 필드·검증·동의 문구·action/method 기록
- [ ] 모든 항목에 기능 ID와 근거 등급 표시, `OBSERVED`는 증거 ID 연결
- [ ] 모든 공개 페이지에 REA `inspect_web_page` 결과, 폼이 있는 페이지에 `analyze_web_bundle` 결과 존재
- [ ] 운영 사이트에 쓰기 요청 0건 (HAR로 확인)
- [ ] 사용자에게 보낼 질문 목록 작성 → **사용자 답변 수령**

### Phase 2 — Migration Contract
**목표:** 무엇을 어떻게 만들지 계약으로 확정한다.
**산출물:** `migration-matrix.md`, `route-compatibility-map.json`, `schema.prisma`, `openapi.yaml`, `architecture.md`, `migration-risks.md`, ADR
**Gate**
- [ ] 모든 레거시 URL에 처리 방식(유지/308/410) 지정
- [ ] 모든 기능 ID가 migration matrix에 있고 테스트 계약이 있음
- [ ] 예약 상태 전환 다이어그램과 정원 처리 규칙 명시
- [ ] D1~D5 결정이 ADR로 기록됨
- [ ] 개인정보 컬럼과 보존 기간 표시
- [ ] BLUEPRINT 4.3의 모든 관리자 기능에 `AD-*` ID와 테스트 계약이 있음
- [ ] AD-002·AD-012·AD-009~011의 범위가 운영자 답변·화면으로 확정됨
- [ ] **사용자 승인**

### Phase 3 — Frontend Reconstruction
**목표:** 공개 화면을 React로 재구현한다.
**Gate**
- [ ] 모든 `PG-*` 구현, 시각 회귀 테스트(1440/390) 통과 또는 차이 사유 기록
- [ ] 레거시 URL 매핑·리다이렉트 테스트 통과
- [ ] 페이지별 메타데이터 이식 확인
- [ ] 권리 미확인 자산 0건
- [ ] 반응형·접근성 기본 점검(키보드 이동, 대체 텍스트, 폼 레이블)

### Phase 4 — Backend Replacement
**목표:** PHP가 하던 서버 처리를 TypeScript로 대체한다.
**Gate**
- [ ] 모든 `FM-*`, `BZ-*` 통합 테스트 통과
- [ ] 모든 `AD-*` 통합 테스트 통과
- [ ] 동시 신청 테스트: 정원 초과 신청 0건
- [ ] 중복 제출(idempotency) 테스트 통과
- [ ] 관리자 전 경로 권한 없는 요청 차단 테스트 통과
- [ ] 로그·에러 응답에 개인정보 없음
- [ ] 신규 앱 코드에 레거시 PHP 호출 0건
- [ ] 실제 알림 업체 어댑터 구현, 스테이징에서 테스트 번호로 발송 확인(D4 결정 후)
- [ ] CSV 다운로드·개인정보 조회 기록 테스트 통과

### Phase 5 — Legacy Parity Testing
**목표:** 레거시와 신규의 화면·입력·흐름이 같음을 확인한다.
**산출물:** `legacy-parity-report.md`
**Gate**
- [ ] 핵심 기능(사용자가 지정한 신청·예약 흐름) 테스트 100% 통과
- [ ] 모든 `PG-*`에 REA `compare_web_captures` 비교 결과 존재, 반복 비교는 Playwright Test로 CI에 포함
- [ ] 시각 차이 전부 "의도된 개선 / 수정 완료"로 분류됨
- [ ] `INFERRED` 항목이 `OBSERVED`로 잘못 표시된 곳 0건
- [ ] 관리자 업무 흐름(신청 확인→상태 변경→알림) E2E 통과

### Phase 6 — Performance & Security
**산출물:** `performance-report.md`, `security-report.md`
**Gate**
- [ ] 주요 페이지 모바일 Core Web Vitals 양호 기준 충족 (LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms)
- [ ] 보안 점검에서 차단 등급 이슈 0건
- [ ] 스테이징 부하 테스트에서 신청 API 오류율 기준 충족 (기준은 Phase 2에서 정함)

### Phase 7 — Cutover 준비
**산출물:** `migration-checklist.md`, `rollback-plan.md`
**Gate**
- [ ] 스테이징 전체 E2E 통과
- [ ] 데이터 이관 검증(해당 시) 또는 이관 불가 기록 처리 방안 확정
- [ ] 롤백 절차를 스테이징에서 한 번 실제로 실행해 봄
- [ ] 모니터링·알림 동작 확인
- [ ] **운영 전환 사용자 승인** — 실제 DNS·프록시 변경은 사람이 함께 진행

---

## 7. 에이전트 운용

| 역할 | 주로 맡는 Phase | 실행 위치 |
|---|---|---|
| Orchestrator | 전체 | Claude Code 메인 세션 |
| Legacy Investigator | 1, 5 | 메인 세션 (REA + Playwright MCP) |
| Frontend Engineer | 3 | worktree `../munsayu-v2-fe` |
| Backend Engineer | 4 | worktree `../munsayu-v2-be` |
| QA / Performance | 5, 6 | 메인 세션 또는 별도 세션 |
| Independent Reviewer | 매 Phase 끝 | 별도 세션 또는 Codex |

- Phase 3·4는 계약(`src/lib/contracts/`)을 먼저 병합한 뒤 병렬 진행합니다.
- 리뷰어는 작업 세션의 결론을 보지 않은 상태에서 산출물과 코드를 먼저 봅니다.

---

## 8. 주요 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| 서버 동작을 관찰할 수 없음 | 정원·알림 등 규칙이 실제와 다를 수 있음 | Phase 1 끝 질문 목록 → 운영자 답변을 근거로 확정 |
| 과거 신청 데이터 없음 | 전환 후 이전 신청 내역 조회 불가 | D1 확인. 불가하면 전환 직전 레거시 관리자 화면 기준으로 별도 보관 |
| 레거시 URL 누락 | 검색 노출·문자 링크 404 | 전환 후 404 로그 모니터링, 발견 즉시 308 추가 |
| 전환 중 들어온 신청 유실 | 학부모 신청 누락 | 전환 시점에 레거시 폼 일시 중단 공지, 전환 직후 테스트 신청 |
| 이미지·폰트 권리 | 법적 문제 | D6 확인 전 해당 자산은 대체 자산 사용 |
| 학생(미성년자) 개인정보 | 법적·신뢰 문제 | 동의 문구 보존, 최소 수집, 마스킹, 보존 기간 설정 |
| 시즌 중 전환 | 신청 몰릴 때 장애 | D8 — 설명회·입학 시즌을 피해 일정 확정 |

---

## 9. 핵심 원칙 요약

1. **URL 호환성** — `/sub/about`, `/sub/schedule.n` 같은 기존 주소는 유지하거나 308로 넘긴다.
2. **동적 기능의 실질적 대체** — 신청은 새 DB에 실제로 저장되고 관리자 화면에서 관리된다.
3. **데이터와 운영 전환** — 기존 DB 없이는 과거 기록이 자동 복구되지 않는다. 확보 경로를 먼저 확인한다.
4. **증거 기반** — 관찰·추론·미확인을 섞지 않는다.
5. **사람의 승인** — 매 Phase와 운영 전환은 사람이 승인한다.

권장 흐름: `PHP 블랙박스 분석 → 기능 계약 확정 → React·TypeScript 재구현 → PHP와 동작 비교 → 점진적 운영 전환`

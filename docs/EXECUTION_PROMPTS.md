# MUNSAYU V2 — Phase별 실행 프롬프트

> Claude Code에 그대로 붙여 넣는 짧은 프롬프트입니다.
> 상세 작업 지시는 `docs/HARNESS_PROMPT.md`의 해당 섹션에 있고, 여기서는 그것을 실행시키는 절차만 담습니다.
>
> **한 Phase의 순서**
> 1. 실행 프롬프트 → Claude가 작업 후 멈춤
> 2. 독립 리뷰 프롬프트 (새 세션) → 리뷰 결과 확인
> 3. 필요하면 수정 프롬프트
> 4. 승인 프롬프트 → 다음 Phase 실행 프롬프트

---

## 공통 시작 블록

모든 실행 프롬프트 앞부분은 같은 확인 절차입니다. 아래 각 Phase 프롬프트에 이미 들어 있습니다.

```
docs/PHASE.md를 먼저 읽어라.
현재 Phase가 N이 아니거나, 이전 Phase가 APPROVED가 아니면 작업하지 말고 그 사실만 보고해라.
이 Phase에 필요한 결정(D번호)이 미정이면 "막힌 것"에 적고 멈춰라.
```

---

## Phase 0 — Harness Bootstrap

> 첫 세션입니다. `HARNESS_PROMPT.md`의 [0] 마스터 프롬프트를 넣어도 되고, 아래를 넣어도 됩니다.

> 실행 전에 직접 할 것: `TOOLING.md` 1.1대로 `npx -y rea-agents@latest setup` 실행, REA 웹 관찰 환경 변수 설정, Claude Code 재시작.

```
docs/PHASE.md, CLAUDE.md, docs/BLUEPRINT.md, docs/MIGRATION_PLAN.md, docs/TOOLING.md를
순서대로 읽어라.

Phase 0을 실행한다.
- 작업 내용: docs/HARNESS_PROMPT.md의 [0] 마스터 프롬프트 "지금 할 일" 1~8번.
- REA와 Playwright는 필수다. 연결이 안 되면 다른 도구로 대신하지 말고
  무엇이 안 되는지와 내가 해야 할 조치를 보고해라.
- PHASE.md "도구 연결 상태" 표를 채워라.
- 시작할 때 PHASE.md 상태를 IN_PROGRESS로 바꾸고 변경 이력에 한 줄 추가.
- munsayu.com에는 접속하지 마라.

끝나면:
1. MIGRATION_PLAN.md 6장 Phase 0 Gate를 항목별로 확인.
2. docs/reports/phase-0-report.md 작성.
3. PHASE.md의 Gate 칸과 상태(GATE_CHECK 또는 GATE_FAIL) 갱신.
4. 멈추고 보고.
```

---

## Phase 1 — PHP 블랙박스 조사

```
docs/PHASE.md를 먼저 읽어라.
현재 Phase가 1이 아니거나 Phase 0이 APPROVED가 아니면 작업하지 말고 보고해라.

PHASE.md "도구 연결 상태"에서 REA·Playwright가 정상이 아니면 멈추고 보고해라.

Phase 1을 실행한다.
- 작업 내용: docs/HARNESS_PROMPT.md의 [1] 전체.
- 도구는 TOOLING.md 1장 역할 분담표 순서대로: 탐색·HAR는 Playwright MCP,
  분석은 REA(inspect_web_page, analyze_web_bundle, inspect_web_network_capture).
- REA 결과는 docs/evidence/rea/에 저장하고 요약만 읽어라.
- CLAUDE.md 3장(금지)과 5장(조사 규칙)을 엄격히 지켜라. 폼 제출 금지, GET만, 1초 간격.
- 시작 시 PHASE.md를 IN_PROGRESS로 갱신.

추가로 할 일:
- BLUEPRINT.md 4장(화면 구성)과 9장(외부 연동)에 관찰한 사실만 초안으로 채워라.
  각 칸에 증거 ID(EV-xxxx)를 붙이고, 근거 없는 칸은 UNKNOWN으로 둬라.
- legacy-unknowns.md 중 운영자(원장님·실무자)만 답할 수 있는 질문을
  PHASE.md "운영자 확인 질문" 표로 옮겨라. 질문은 학원 실무자가 이해할 수 있는 말로 써라.

끝나면 Gate 확인 → phase-1-report.md → PHASE.md 갱신 → 멈추고 보고.
코드는 작성하지 마라.
```

---

## Phase 2 — 마이그레이션 계약

> 시작 전에 PHASE.md의 운영자 질문 답변과 D1~D5 결정을 직접 채워 두세요.

```
docs/PHASE.md를 먼저 읽어라.
현재 Phase가 2가 아니거나 Phase 1이 APPROVED가 아니면 작업하지 말고 보고해라.
D1~D5 중 미정이 있으면, 각 결정의 선택지와 추천안·이유만 정리해서 보고하고 멈춰라.

Phase 2를 실행한다.
- 작업 내용: docs/HARNESS_PROMPT.md의 [2] 전체.
- PHASE.md의 운영자 답변과 D1~D5 결정을 근거로 써라. 답변으로 확인된 항목은
  근거를 "운영자 답변 Q-xx"로 표시해라.
- 시작 시 PHASE.md를 IN_PROGRESS로 갱신.

추가로 할 일:
- BLUEPRINT.md의 [Claude 작성] 칸 중 3, 4, 5, 6, 7, 8, 9, 11장을 채워라.
  세부 내용은 docs/contracts/에 쓰고 BLUEPRINT에는 요약과 링크만.
- [확정] 원칙과 충돌하는 설계가 필요하면 바꾸지 말고 ADR로 제안해라.
- PHASE.md "기능 이관 요약" 표의 '전체' 열을 채워라.

끝나면 Gate 확인 → phase-2-report.md("내가 승인할 결정 목록" 포함)
→ PHASE.md 갱신 → 멈추고 보고. 구현은 시작하지 마라.
```

---

## Phase 3·4 — 프론트엔드·백엔드 병렬 구현

> D6(이미지·폰트 권리)을 먼저 정하세요. 세션은 세 개를 씁니다.

### 3·4-A. 메인 세션 — 준비

```
docs/PHASE.md를 먼저 읽어라.
현재 Phase가 3이 아니거나 Phase 2가 APPROVED가 아니면 작업하지 말고 보고해라.

Phase 3·4 준비를 실행한다.
- 작업 내용: docs/HARNESS_PROMPT.md [3·4]의 "조정 프롬프트".
- PHASE.md에서 Phase 3과 4를 모두 IN_PROGRESS로 갱신.
- docs/reports/migration-status.md를 만들고 기능 ID 전체를 '미착수'로 등록.

끝나면 FE·BE 각 worktree 경로와 브랜치를 보고하고 멈춰라.
```

### 3·4-B. FE worktree 세션

```
CLAUDE.md, docs/BLUEPRINT.md, docs/contracts/를 읽어라.
너는 Frontend Migration Engineer다. 작업 위치는 이 worktree뿐이다.

작업 내용: docs/HARNESS_PROMPT.md [3·4]의 "Frontend Migration Engineer" 전체.
- 파일 소유권은 docs/reports/phase-3-4-ownership.md를 따른다.
- 기능 하나 끝날 때마다 테스트 → 커밋 → migration-status.md 갱신.
- 계약 변경이 필요하면 작업을 멈추고 이유를 보고해라.

모든 PG-* 기능이 끝나면 완료 보고하고 멈춰라. PHASE.md는 건드리지 마라.
```

### 3·4-C. BE worktree 세션

```
CLAUDE.md, docs/BLUEPRINT.md, docs/contracts/를 읽어라.
너는 Backend Replacement Engineer다. 작업 위치는 이 worktree뿐이다.

작업 내용: docs/HARNESS_PROMPT.md [3·4]의 "Backend Replacement Engineer" 전체.
- BLUEPRINT.md 2장(계층 책임)과 5장 고정 규칙(트랜잭션, idempotency, 알림 실패 처리)을 지켜라.
- 기능 하나 끝날 때마다 테스트 → 커밋 → migration-status.md 갱신.
- 계약 변경이 필요하면 작업을 멈추고 이유를 보고해라.

모든 FM·BZ·AD 기능이 끝나면 완료 보고하고 멈춰라. PHASE.md는 건드리지 마라.
```

### 3·4-D. 메인 세션 — 통합

```
docs/PHASE.md와 docs/reports/migration-status.md를 읽어라.
FE·BE 두 worktree가 완료 보고를 했는지 확인하고, 아니면 남은 기능을 보고하고 멈춰라.

통합을 실행한다.
- 작업 내용: docs/HARNESS_PROMPT.md [3·4]의 "통합 프롬프트".
- BLUEPRINT.md의 설계와 실제 구현이 달라진 곳이 있으면 BLUEPRINT에 반영하고 이유를 적어라.
  [확정] 원칙과 달라진 곳은 반영하지 말고 위반으로 보고해라.

끝나면 Phase 3·4 Gate를 각각 확인 → phase-3-report.md, phase-4-report.md
→ PHASE.md 갱신(기능 이관 요약의 '구현'·'테스트 통과' 열 포함) → 멈추고 보고.
```

---

## Phase 5 — 레거시 동등성 검증

> 시작 전에 "핵심 기능"이 무엇인지(Gate 100% 대상) PHASE.md 변경 이력에 적어 두세요.
> 예: 상담 신청, 설명회 신청, 예약.

```
docs/PHASE.md를 먼저 읽어라.
현재 Phase가 5가 아니거나 Phase 3·4가 APPROVED가 아니면 작업하지 말고 보고해라.

Phase 5를 실행한다.
- 작업 내용: docs/HARNESS_PROMPT.md의 [5] 전체.
- 비교는 REA(compare_web_captures, compare_web_screenshots)를 먼저 쓰고,
  반복 비교는 Playwright Test로 tests/parity/에 코드화해라.
- 운영 사이트에는 GET과 화면 관찰만. 쓰기 요청 금지.
- 핵심 기능 목록은 PHASE.md 변경 이력에 내가 적은 것을 따른다. 없으면 묻고 멈춰라.
- 시작 시 PHASE.md를 IN_PROGRESS로 갱신.

끝나면 Gate 확인 → phase-5-report.md → PHASE.md 갱신
(기능 이관 요약의 '동등성 확인' 열 포함) → 멈추고 보고.
```

---

## Phase 6 — 성능·보안

```
docs/PHASE.md를 먼저 읽어라.
현재 Phase가 6이 아니거나 Phase 5가 APPROVED가 아니면 작업하지 말고 보고해라.

Phase 6을 실행한다.
- 작업 내용: docs/HARNESS_PROMPT.md의 [6] 전체.
- 도구: Chrome DevTools MCP(Lighthouse·성능 트레이스), Lighthouse CI, k6, npm audit.
- 부하 테스트는 스테이징에서만. 운영 사이트·운영 DB 대상 금지.
- 보안 점검 기준은 BLUEPRINT.md 7장(인증·권한)과 10장(개인정보·보안).
- 시작 시 PHASE.md를 IN_PROGRESS로 갱신.

수정은 성능·보안 문제 해결에 필요한 것만 해라. 범위 밖 리팩터링 금지.
끝나면 Gate 확인 → phase-6-report.md → PHASE.md 갱신 → 멈추고 보고.
```

---

## Phase 7 — 전환 준비

> D7(도메인·DNS 권한)과 D8(전환 일정)을 먼저 정하세요.

```
docs/PHASE.md를 먼저 읽어라.
현재 Phase가 7이 아니거나 Phase 6이 APPROVED가 아니면 작업하지 말고 보고해라.
D7, D8이 미정이면 막힌 것에 적고 멈춰라.

Phase 7을 실행한다.
- 작업 내용: docs/HARNESS_PROMPT.md의 [7] 전체.
- DNS·프록시·운영 배포는 실행하지 말고 문서로만 준비해라.
- BLUEPRINT.md 11장(환경)과 12장(관측)의 남은 칸을 채워라.
- 롤백 절차는 스테이징에서 한 번 실제로 실행하고 결과를 기록해라.
- 시작 시 PHASE.md를 IN_PROGRESS로 갱신.

끝나면 Gate 확인 → phase-7-report.md → PHASE.md 갱신 → 멈추고 보고.
운영 전환은 내가 승인한 뒤 함께 진행한다.
```

---

## 매 Phase 공통 — 리뷰·수정·승인

### 독립 리뷰 (새 세션 또는 Codex)

```
docs/PHASE.md를 읽고 현재 GATE_CHECK 상태인 Phase 번호를 확인해라.
그 Phase에 대해 docs/HARNESS_PROMPT.md의 [R] 독립 리뷰 프롬프트를 실행해라.
결과를 docs/reports/phase-N-review.md에 쓰고,
PHASE.md의 '독립 리뷰' 칸을 "차단 n / 권장 n"으로 갱신하고 상태를 IN_REVIEW로 바꿔라.
코드는 고치지 마라.
```

### 수정 (Gate FAIL 또는 리뷰 차단 항목이 있을 때)

```
docs/PHASE.md, phase-N-report.md, phase-N-review.md를 읽어라.
FAIL 항목과 리뷰의 '차단' 항목만 수정해라. '수정 권장'은 내가 지정한 것만.
범위 밖 개선 금지.
수정 후 Gate를 다시 확인하고 보고서와 PHASE.md를 갱신한 뒤 멈춰라.
```

### 승인 (사람이 확인한 뒤)

```
Phase N을 승인한다.
docs/PHASE.md에서:
- Phase N의 '사람 승인' 칸을 ☑로, 상태를 APPROVED로 바꿔라.
- 현재 Phase를 N+1로, 상태를 NOT_STARTED로 바꿔라.
- 변경 이력에 "Phase N 승인 (사용자 지시)" 한 줄 추가.
다른 작업은 하지 말고 멈춰라.
```

### 세션 재개 (컨텍스트가 끊겼을 때)

```
docs/PHASE.md, CLAUDE.md, docs/BLUEPRINT.md, 가장 최근 phase-*-report.md를 읽고
현재 Phase, 상태, 남은 작업, 막힌 것을 요약해라. 요약만 하고 지시를 기다려라.
```
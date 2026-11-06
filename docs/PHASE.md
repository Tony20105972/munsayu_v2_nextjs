# MUNSAYU V2 — Phase 진행 상태판

> 이 파일은 **현재 어디까지 왔는지**를 보여주는 단일 기준입니다.
> - Claude Code는 세션을 시작할 때 이 파일을 가장 먼저 읽고, 여기 적힌 "현재 Phase"만 작업합니다.
> - Phase가 끝나면 Claude가 이 파일을 갱신합니다. **승인 칸은 사람만 채웁니다.**
> - Gate 기준의 원본은 `docs/MIGRATION_PLAN.md` 6장입니다. 여기에는 결과만 적습니다.

---

## 현재 상태

| 항목 | 값 |
|---|---|
| 현재 Phase | **0 — Harness Bootstrap** |
| 상태 | `GATE_FAIL` |
| 마지막 갱신 | 2026-11-06 |
| 다음 행동 | Chrome CDP와 Playwright MCP를 연결한 뒤 Phase 0 Gate FAIL 항목만 재검증 |
| 막힌 것 | `BLUEPRINT.md` 누락; REA CDP endpoint_unreachable; Playwright MCP 미연결 |

상태 값: `NOT_STARTED` → `IN_PROGRESS` → `GATE_CHECK` → `IN_REVIEW` → `APPROVED`
(Gate 실패 시 `GATE_FAIL` → 수정 후 다시 `GATE_CHECK`)

---

## Phase 진행표

| # | Phase | 상태 | Gate | 독립 리뷰 | 사람 승인 | 보고서 |
|---|---|---|---|---|---|---|
| 0 | Harness Bootstrap | GATE_FAIL | FAIL (0/6) | — | ☐ | `reports/phase-0-report.md` |
| 1 | PHP Black-Box Reconnaissance | NOT_STARTED | — | — | ☐ | `reports/phase-1-report.md` |
| 2 | Migration Contract | NOT_STARTED | — | — | ☐ | `reports/phase-2-report.md` |
| 3 | Frontend Reconstruction | NOT_STARTED | — | — | ☐ | `reports/phase-3-report.md` |
| 4 | Backend Replacement | NOT_STARTED | — | — | ☐ | `reports/phase-4-report.md` |
| 5 | Legacy Parity Testing | NOT_STARTED | — | — | ☐ | `reports/phase-5-report.md` |
| 6 | Performance & Security | NOT_STARTED | — | — | ☐ | `reports/phase-6-report.md` |
| 7 | Cutover 준비 | NOT_STARTED | — | — | ☐ | `reports/phase-7-report.md` |

- Gate 칸: `PASS (n/n)` 또는 `FAIL (통과 수/전체)`
- 독립 리뷰 칸: `차단 0 / 권장 n` 형식
- 3·4는 병렬 진행이 가능하지만 승인은 각각 받습니다.

---

## 도구 연결 상태

Phase 0에서 Claude가 채웁니다. 필수 도구가 `정상`이 아니면 Phase 1·5는 시작할 수 없습니다. 기준은 `docs/TOOLING.md`입니다.

| 도구 | 구분 | 상태 | 버전 | 확인일 | 비고 |
|---|---|---|---|---|---|
| REA MCP | 필수 | 오류 | rea-agents 6.8.0 / MCP server 2.3.1 | 2026-11-06 | Codex 등록·도구 229개는 정상이나 `127.0.0.1:9222`가 `endpoint_unreachable` |
| Playwright MCP | 필수 | 미설치 | — | 2026-11-06 | 활성 Codex 세션 도구 목록에 `mcp__playwright__*` 없음 |
| Playwright Test | 필수 | 미확인 | — | 2026-11-06 | 필수 MCP 미연결로 프로젝트·브라우저 설치 미실행 |
| Chrome DevTools MCP | 권장 | 미설치 | — | 2026-11-06 | 활성 도구 목록에 없음 |
| Next.js DevTools MCP | 권장 | 미설치 | — | 2026-11-06 | 활성 도구 목록에 없음 |
| Context7 | 권장 | 미설치 | — | 2026-11-06 | 활성 도구 목록에 없음 |

상태 값: `정상` / `오류` / `미설치` / `미확인`

---

## 결정 사항 현황

`MIGRATION_PLAN.md` 3장의 결정 목록입니다. Claude는 **선택지와 추천안만** 적고, 결정은 사람이 합니다.

| # | 결정 사항 | 필요 시점 | 상태 | 결정 내용 | ADR |
|---|---|---|---|---|---|
| D1 | 기존 데이터 확보 가능 여부 | Phase 2 | 미정 | | |
| D2 | DB (PostgreSQL 신규 / MySQL 연결) | Phase 2 | 미정 | | |
| D3 | 배포 환경 | Phase 2 | 미정 | | |
| D4 | 문자·메일 공급사 | Phase 2 | 미정 | | |
| D5 | 관리자 역할·권한 | Phase 2 | 미정 | | |
| D6 | 이미지·폰트 사용 권리 | Phase 3 전 | 미정 | | |
| D7 | 도메인·DNS 관리 권한 | Phase 7 전 | 미정 | | |
| D8 | 전환 일정 | Phase 7 | 미정 | | |

필요 시점이 된 결정이 `미정`이면 해당 Phase는 시작할 수 없습니다. Claude는 "막힌 것"에 적고 멈춥니다.

---

## 운영자 확인 질문 (Phase 1 이후)

`docs/legacy/legacy-unknowns.md`에서 운영자(원장님·실무자)의 답이 필요한 질문만 여기로 옮깁니다.

| ID | 질문 | 관련 기능 | 답변 | 답변일 |
|---|---|---|---|---|
| — | (Phase 1에서 Claude가 채움) | | | |

---

## 기능 이관 요약 (Phase 2 이후)

세부 내용은 `docs/reports/migration-status.md`에 있습니다. 여기에는 숫자만 적습니다.

| 구분 | 전체 | 구현 | 테스트 통과 | 동등성 확인 |
|---|---|---|---|---|
| PG 페이지 | | | | |
| FM 폼 | | | | |
| BZ 비즈니스 규칙 | | | | |
| AD 관리자 | | | | |
| RT 레거시 URL | | | | |

---

## 변경 이력

Claude는 Phase 상태가 바뀔 때마다 한 줄씩 추가합니다. 위쪽이 최신입니다.

| 날짜 | Phase | 변경 | 작성 |
|---|---|---|---|
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
4. 리뷰 반영 후: 상태를 `IN_REVIEW`로 바꾸고 **멈춥니다.**
5. `사람 승인` 칸과 `APPROVED` 상태, 결정 사항의 `결정 내용`은 Claude가 스스로 채우지 않습니다. 사람이 직접 고치거나, 승인 프롬프트(`EXECUTION_PROMPTS.md`)로 명시적으로 지시한 경우에만 기록합니다.
6. 사람이 승인하면 "현재 Phase"를 다음 번호로 바꾸고 `NOT_STARTED`로 시작합니다.

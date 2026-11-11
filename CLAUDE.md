# MUNSAYU V2 — 작업 규약 (Claude Code / Codex 공통)

> 이 파일은 저장소 루트에 둡니다. Claude Code는 세션마다 자동으로 읽습니다.
> Codex용으로는 같은 내용을 `AGENTS.md`로 복사해 두세요.
> 실행 계획은 `docs/MIGRATION_PLAN.md`, Phase별 프롬프트는 `docs/HARNESS_PROMPT.md`를 따릅니다.
> 세션을 시작하면 `docs/PHASE.md`(현재 진행 상태)를 가장 먼저 읽고, 설계 원칙은 `docs/BLUEPRINT.md`를 따릅니다.
> 도구 사용 순서와 설치·안전 설정은 `docs/TOOLING.md`를 따릅니다. **레거시 분석은 REA, 브라우저 조작·테스트는 Playwright가 최우선입니다.**

---

## 1. 프로젝트 정의

- **원본(Legacy):** https://munsayu.com — PHP 기반 운영 사이트
- **목표(Target):** Next.js App Router + TypeScript 풀스택 애플리케이션
- **방식:** PHP 소스코드와 DB에 접근할 수 없으므로 **블랙박스 마이그레이션**입니다.
  운영 사이트에서 관찰할 수 있는 HTML·JS·HTTP 요청/응답·사용자 흐름을 근거로 재구현합니다.
  PHP 코드를 자동 변환하는 작업이 아닙니다.
- **완료 조건:** 신규 앱이 런타임에 PHP 서버에 전혀 의존하지 않고, 검증된 레거시 기능(페이지·폼·예약·관리)을 모두 대체합니다.

---

## 2. 근거 등급 (모든 문서·코드 주석에 적용)

| 등급 | 의미 | 예 |
|---|---|---|
| `OBSERVED` | 직접 확인했고 증거 파일이 있음 | 스크린샷, HAR, DOM 스냅샷, 응답 본문 |
| `OBSERVED-USER` | 사용자가 제공한 화면·자료에서 확인. Claude가 직접 관찰한 것은 아님. | `docs/photo/`의 사용자 제공 스크린샷 |
| `INFERRED` | 관찰 결과에서 추론함. 근거를 함께 적음 | "제출 후 /sub/complete로 이동 → 서버에서 저장 후 리다이렉트로 추정" |
| `UNKNOWN` | 확인 불가. 사용자 결정이나 추가 정보가 필요함 | 정원 초과 시 서버 동작, 관리자 화면 구성 |

- `INFERRED`·`UNKNOWN`을 `OBSERVED`로 올리려면 증거 파일이 있어야 합니다.
- 모든 증거는 `docs/evidence/ledger.md`에 ID(`EV-0001` 형식)로 기록합니다.
- `UNKNOWN`을 구현할 때는 추측으로 채우지 말고 `docs/legacy/legacy-unknowns.md`에 질문으로 남긴 뒤 사용자에게 묻습니다.

---

## 3. 절대 금지

1. 운영 사이트(munsayu.com)를 수정하거나 쓰기 요청(POST/PUT/DELETE)을 보내는 것
2. 실제 예약·상담·설명회 신청을 제출하는 것
3. 인증·접근 제한을 우회하거나 관리자 경로(`/uAdmin/` — robots.txt 확인 EV-0002, `/adm/`)를 추측해서 두드리는 것
4. 실제 학생·학부모 개인정보를 수집·저장하거나 테스트에 쓰는 것
5. PHP 내부 소스를 봤다고 주장하는 것
6. 성공 응답을 가짜로 만들어 테스트를 통과시키는 것 (mock은 단위 테스트 범위에서만)
7. 사용자 승인 없이 다음 Phase로 넘어가는 것
8. 사용자 승인 없이 DNS·프록시·운영 배포를 건드리는 것
9. 권리가 확인되지 않은 이미지·폰트를 신규 저장소에 커밋하는 것

---

## 4. Phase 게이트 규칙

- 한 번에 **한 Phase만** 진행합니다.
- Phase 안에서 의문점이 생겨도 멈추지 않습니다. 관찰된 동작이 없으면 가장 단순하고 나중에 바꾸기 쉬운 기본안을 적용하고 `ASM-xxx`로 기록합니다. [확정] BLUEPRINT 원칙과 충돌하면 그 원칙을 따릅니다.
- ASM은 `docs/reports/open-questions.md`에 번호·가정·이유·반영 위치·변경 방법·원장님 질문을 기록합니다. 구현 시 해당 코드 위치에도 `// ASM-xxx` 주석을 남깁니다.
- Phase가 끝나면 Gate 확인 → 작업 맥락을 모르는 독립 리뷰어에게 산출물·코드만 전달한 리뷰 → 차단 항목 수정 → 보고서 작성 순으로 진행하고 **멈춥니다.** 다음 Phase는 사람 승인 후에만 시작합니다. Phase 3과 4는 동시에 진행하고 둘 다 끝난 뒤 한 번만 멈춥니다.
- Gate 기준은 `docs/MIGRATION_PLAN.md`에 있는 체크리스트가 기준입니다. 하나라도 미충족이면 `FAIL`로 보고합니다.
- `FAIL` 또는 독립 리뷰 차단 항목은 원인과 해결 계획을 적고, 같은 Phase 안에서 수정합니다.

### Phase 보고서 형식

```md
# Phase N 보고서 — <Phase 이름>
- 완료한 작업
- 변경한 파일 (경로 목록)
- 이관된 PHP 기능 (기능 ID 목록)
- 실행한 테스트와 결과 (명령어 + 통과/실패 수)
- 남은 UNKNOWN / 알려진 한계
- 사용자 결정이 필요한 항목
- Gate: PASS | FAIL (체크리스트 항목별 결과)
```

---

## 5. 레거시 조사 규칙 (Phase 1, 5)

### 도구 우선순위
1. **REA** — 페이지 구조·폼·스크립트·네트워크 기록 분석, 레거시 vs 신규 비교 (`TOOLING.md` 1.1)
2. **Playwright** — 페이지 탐색, 반응형 스크린샷, HAR 기록, 테스트 코드 (`TOOLING.md` 1.2)
3. 그 밖의 도구 — REA·Playwright로 할 수 없는 일에만 쓰고, 보고서에 이유를 적습니다.

- REA·Playwright 중 하나라도 연결되지 않으면 Phase 1·5를 시작하지 않고 보고합니다.
- REA 결과는 `docs/evidence/rea/`에 파일로 저장하고, REA `evidence_id`를 ledger의 `EV-xxxx`와 짝지어 기록합니다.
- REA 시나리오와 Playwright 탐색에는 화면 이동 클릭만 넣습니다. 제출 버튼 클릭·폼 입력은 하지 않습니다.

### 조사 방식
- `robots.txt`를 먼저 확인하고 따릅니다.
- 요청 간격은 최소 1초. 동시 요청 금지.
- GET 요청과 화면 관찰만 합니다.
- 폼은 **제출하지 않습니다.** 필드 이름·타입·필수 여부·클라이언트 검증·action URL·method만 기록합니다.
- 제출 후 동작을 꼭 알아야 하면 사용자에게 승인을 받고, 사용자가 지정한 테스트 데이터로 한 번만 진행합니다.
- 증거는 `docs/evidence/` 아래에 저장합니다: `screenshots/`, `har/`, `dom/`.
- 증거 파일에 개인정보가 찍혀 있으면 저장 전에 가립니다.
- 사이트에 법적으로 공개 표시된 사업자 정보(상호, 대표자, 사업자등록번호, 주소, 대표 전화, 대표 이메일, 개인정보 보호책임자)는 가리지 않고 증거로 보관할 수 있습니다. 이 예외는 신청자·학생·학부모·직원 개인의 정보에는 적용하지 않습니다.

---

## 6. 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 이상 (App Router), React, TypeScript `strict` — Next.js DevTools MCP가 16 이상을 요구 |
| 스타일 | Tailwind CSS |
| 검증 | Zod (모든 서버 입력 경계) |
| DB | PostgreSQL + Prisma — **단, Phase 2에서 MySQL 유지 여부를 확정** |
| 테스트 | Vitest(단위·통합), Playwright Test(E2E·시각 회귀·레거시 비교) |
| 레거시 분석 | REA MCP (최우선), Playwright MCP |
| 보조 MCP | `TOOLING.md` 2·3장 (Chrome DevTools, Next.js DevTools, Context7 등) |
| CI | GitHub Actions |
| 패키지 매니저 | Phase 0에서 하나로 고정하고 lockfile 커밋 |

- 새 의존성을 추가하려면 보고서에 이유를 적습니다. 같은 일을 하는 라이브러리를 두 개 넣지 않습니다.
- 마이크로서비스로 쪼개지 않습니다. 모듈형 모놀리스 하나로 갑니다.

---

## 7. 코드 규칙

### 프론트엔드
- 기본은 Server Component. 상호작용이 필요한 부분만 `'use client'`.
- 공통 헤더·푸터는 `app/layout.tsx`와 `src/components/layout/`에.
- 레거시 URL은 같은 경로로 제공하거나 `next.config` / `middleware`에서 308(영구) 리다이렉트. 매핑의 원본은 `docs/contracts/route-compatibility-map.json` 하나뿐입니다.
- 페이지마다 레거시의 `title`, `description`, `canonical`, OG 태그를 `generateMetadata`로 이식합니다.
- 이미지는 `next/image`로. 권리 확인된 이미지만 사용합니다.

### 백엔드
- 비즈니스 로직은 `src/server/services/`에. Route Handler와 Server Action은 입력 검증 → 서비스 호출 → 응답만 합니다.
- Prisma 클라이언트는 `src/server/db.ts`에서만 만들고, 클라이언트 번들에 들어가지 않게 `server-only`를 import합니다.
- 예약 정원 확인과 저장은 **하나의 DB 트랜잭션** 안에서 처리합니다. 동시 신청 테스트가 반드시 있어야 합니다.
- 신청·예약 API는 idempotency key를 받아 중복 제출을 막습니다.
- 관리자 기능은 서버에서 매 요청 권한(RBAC)을 확인합니다. 화면에서 버튼을 숨기는 것만으로는 권한 처리가 아닙니다.
- 개인정보(이름, 연락처 등)는 로그에 남기지 않습니다. 관리자 목록 화면에서는 기본적으로 일부를 가립니다.
- 문자·메일 발송은 `src/server/adapters/notify/` 인터페이스 뒤에 둡니다. 개발·테스트 환경에서는 실제 발송하지 않는 어댑터를 씁니다.
- 비밀값은 `.env`에만 두고 `.env.example`에 키 이름만 적습니다.

---

## 8. 디렉터리 구조

```
munsayu-v2/
├─ CLAUDE.md / AGENTS.md
├─ docs/
│  ├─ MIGRATION_PLAN.md
│  ├─ HARNESS_PROMPT.md
│  ├─ TOOLING.md
│  ├─ photo/           사용자 제공 화면(관리자 등)
│  ├─ evidence/        ledger.md, rea/, screenshots/, har/, dom/
│  ├─ legacy/          Phase 1 산출물
│  ├─ contracts/       Phase 2 산출물 (migration-matrix.md, route-compatibility-map.json, openapi.yaml …)
│  ├─ decisions/       ADR-001-*.md (되돌리기 어려운 결정 기록)
│  └─ reports/         phase-N-report.md, 각종 검증 리포트
├─ app/                App Router (공개 페이지, /admin, /api)
├─ src/
│  ├─ components/
│  ├─ server/          services/, adapters/, auth/, db.ts
│  └─ lib/             공용 유틸, zod 스키마
├─ prisma/             schema.prisma, migrations/, seed.ts (가짜 데이터만)
├─ public/
├─ tests/              unit/, integration/, e2e/, visual/, parity/
└─ .github/workflows/
```

---

## 9. Git 규칙

- `main`은 보호 브랜치. 직접 커밋하지 않습니다.
- 작업 단위: `feat/<기능ID>-<짧은설명>`, `docs/phase-N`, `fix/...`
- 병렬 작업은 Git worktree로 분리합니다 (`../munsayu-v2-fe`, `../munsayu-v2-be`).
- 프론트·백엔드가 같은 파일을 동시에 고치지 않습니다. 공유 지점은 `src/lib/contracts/`의 타입과 `docs/contracts/openapi.yaml`뿐이며, 계약을 바꾸려면 먼저 계약 문서를 수정하고 사용자 승인을 받습니다.
- CI(타입체크·린트·테스트)가 통과해야 병합합니다.

---

## 10. 기능 ID 규칙

Phase 1에서 기능마다 ID를 붙이고 모든 문서·브랜치·테스트에서 같은 ID를 씁니다.

- `PG-xxx` 페이지 (예: `PG-001 메인`)
- `FM-xxx` 폼·신청 (예: `FM-001 상담 신청`)
- `BZ-xxx` 비즈니스 규칙 (예: `BZ-001 설명회 정원 마감`)
- `AD-xxx` 관리자 기능
- `RT-xxx` 레거시 URL

테스트 이름에도 ID를 넣습니다: `test('FM-001 상담 신청: 필수값 누락 시 오류', ...)`

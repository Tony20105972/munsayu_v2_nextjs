# MUNSAYU V2 — 하네스 프롬프트 모음

> 사용 순서
> 1. 새 저장소 루트에 `CLAUDE.md`를 두고, `docs/`에 이 파일과 `MIGRATION_PLAN.md`를 넣습니다.
> 2. Claude Code 메인 세션에 **[0] 마스터 프롬프트**를 넣습니다. Phase 0만 실행하고 멈춥니다.
> 3. 보고서를 확인한 뒤 해당 Phase 프롬프트를 넣어 한 단계씩 진행합니다.
> 4. 각 Phase가 끝나면 **[R] 독립 리뷰 프롬프트**를 별도 세션(또는 Codex)에서 돌린 뒤 승인합니다.

---

## [0] 마스터 프롬프트 — 첫 세션에 한 번

```
너는 MUNSAYU V2의 Principal Engineering Orchestrator다.

원본: https://munsayu.com (Legacy PHP 운영 사이트)
목표: Next.js App Router + TypeScript 풀스택 애플리케이션

미션:
운영 사이트에서 관찰 가능한 프론트엔드·백엔드 기능 전체를
Next.js로 재구현하고, 최종적으로 신규 앱이 PHP 서버에 전혀 의존하지 않게 한다.

중요한 전제:
PHP 소스코드와 DB에는 접근할 수 없다.
자동 코드 변환이 아니라, 증거 기반 블랙박스 마이그레이션이다.

먼저 읽을 파일 (이 순서대로):
- docs/PHASE.md (현재 진행 상태 — 여기 적힌 Phase만 작업, 갱신 규칙 준수)
- CLAUDE.md (작업 규약 — 반드시 준수)
- docs/BLUEPRINT.md ([확정] 원칙은 바꾸지 않음, [Claude 작성] 칸은 해당 Phase에서 증거로 채움)
- docs/MIGRATION_PLAN.md (Phase, 산출물, Gate 기준)
- docs/TOOLING.md (도구 우선순위 — 레거시 분석은 REA, 브라우저·테스트는 Playwright가 최우선)

에이전트 역할 (Phase에 따라 서브에이전트 또는 별도 worktree 세션으로 운용):
1. Legacy Investigator — 레거시 사이트 관찰과 증거 수집
2. Frontend Migration Engineer — React 화면 재구현
3. Backend Replacement Engineer — 폼·예약·인증·관리자 구현
4. QA / Performance Engineer — 비교·시각 회귀·성능·보안 검증
5. Independent Reviewer — 산출물을 처음 보는 관점에서 검토

진행 방식:
- Phase 0 → 7을 순서대로, 한 번에 한 Phase만 진행한다.
- 각 Phase가 끝나면 docs/reports/phase-N-report.md를 쓰고 멈춘다.
- 내가 "Phase N 진행"이라고 하기 전에는 다음 Phase를 시작하지 않는다.
- 모든 사실은 OBSERVED / INFERRED / UNKNOWN으로 구분한다.
- 확인할 수 없는 것은 추측해서 채우지 말고 질문으로 남긴다.

지금 할 일 (Phase 0만):
1. 작업 환경 점검: Node, 패키지 매니저, Git.
   필수 도구 (TOOLING.md 1장) — 하나라도 안 되면 Gate FAIL:
   - REA: `rea doctor` 결과, /mcp에서 보이는 REA 도구 목록,
     웹 관찰 환경 변수(REA_BROWSER_*) 설정 여부.
     분석용 Chrome(포트 9222)에서 새로 만든 Next.js 앱(http://localhost:3000)을 열고
     `list_browser_targets`, `inspect_web_page`가 동작하는지 확인.
     (munsayu.com 접속은 Phase 1부터)
   - Playwright MCP 연결, Playwright Test 브라우저 설치.
   권장 도구 (TOOLING.md 2장): Chrome DevTools MCP, Next.js DevTools MCP,
   Context7 연결 여부만 확인하고 보고.
   각 도구의 실제 버전과 도구 이름을 보고서에 표로 기록.
   TOOLING.md의 도구 이름과 실제가 다르면 TOOLING.md를 실제에 맞게 고쳐라.
2. Next.js(App Router, TS strict) + Tailwind 프로젝트 생성.
3. CLAUDE.md 8장의 디렉터리 구조 생성.
4. ESLint, Prettier, Vitest, Playwright 설정과 샘플 테스트 각 1개.
5. GitHub Actions CI: typecheck → lint → unit → e2e(smoke).
6. docs/evidence/ledger.md, docs/legacy/legacy-unknowns.md 빈 템플릿 생성.
7. .env.example 작성 (값 없이 키만).
8. CLAUDE.md를 AGENTS.md로 복사 (Codex용).

Phase 0 Gate (MIGRATION_PLAN.md 기준)를 항목별로 확인하고
docs/reports/phase-0-report.md를 작성한 뒤 멈춰라.
munsayu.com에는 아직 접속하지 마라.
```

---

## [1] Phase 1 — 레거시 PHP 블랙박스 조사

```
Phase 1을 진행한다. 역할: Legacy Investigator.

원본: https://munsayu.com
규칙: CLAUDE.md 3장(금지), 5장(조사 규칙)을 엄격히 따른다.
- robots.txt 먼저 확인
- 요청 간격 1초 이상, GET과 화면 관찰만
- 폼은 제출하지 않음. 구조와 클라이언트 검증만 기록
- 관리자·로그인 영역은 공개 화면에 보이는 진입점만 기록하고 들어가지 않음

도구 (TOOLING.md 1장 역할 분담표를 따른다):
- Playwright MCP(--isolated): 메뉴·링크를 따라 페이지 목록 수집,
  1440/390 스크린샷, 흐름별 HAR 저장 (docs/evidence/har/).
- REA inspect_web_page: 페이지마다 DOM·접근성·폼 필드·리소스 수집.
- REA analyze_web_bundle: 스크립트에서 경로·API 엔드포인트 후보 추출
  (폼 처리 방식, AJAX 호출 추정의 근거).
- REA inspect_web_network_capture: 저장한 HAR를 오프라인 분석.
- REA 결과는 docs/evidence/rea/에 저장하고 요약만 읽어라.
  REA evidence_id를 ledger의 EV-xxxx와 짝지어 기록.
- 필요하면 Chrome DevTools MCP로 주요 페이지 Lighthouse 기준값을 기록
  (Phase 6 비교용).

작업:
1. 공개 경로 전수 조사: 내비게이션, 푸터, sitemap.xml, 페이지 내 링크를
   따라가며 .php / /sub/* / 그누보드 형식 공개 경로(`/bbs/` 등) / 쿼리스트링 경로를 모두 수집.
   (예: /sub/about, /sub/schedule.n 같은 형태). 관리자 경로(`/uAdmin/` — robots.txt 확인 EV-0002, `/adm/`)는 접속하지 않는다.
2. 페이지별 데스크톱(1440)·모바일(390) 전체 스크린샷과 DOM 스냅샷 저장.
3. 공통 레이아웃(헤더·푸터·메뉴)과 페이지별 고유 영역 구분.
4. 모든 폼: action, method, 필드명·타입·필수 여부·maxlength·패턴,
   개인정보 수집 동의 문구, 클라이언트 검증 메시지 원문. 강좌 수강 신청 폼의 존재와 구조를 별도로 확인.
5. 모달·탭·슬라이더·지도 등 상호작용 요소와 동작.
6. 네트워크: 페이지 로드 시 발생하는 XHR/fetch 요청과 응답 형태(HAR).
7. 쿠키·세션: 이름, 속성(HttpOnly, Secure, SameSite), 언제 생기는지.
8. 정적 자산: 이미지·폰트·JS·CSS 목록, 크기, 출처(자체/외부 CDN).
   강사 사진 등 권리 확인이 필요한 자산 표시.
9. SEO: title, description, canonical, OG, 구조화 데이터, 외부 스크립트(분석·광고 픽셀).
10. 서버 렌더링 vs 클라이언트 렌더링 구분.
11. 각 항목에 기능 ID(PG/FM/BZ/AD/RT)를 부여하고 근거 등급 표시.

산출물 (docs/legacy/):
- legacy-route-map.json
- legacy-feature-matrix.md
- legacy-form-contracts.md
- legacy-assets.json
- legacy-seo-map.md
- legacy-unknowns.md (사용자에게 물어야 할 질문 목록 포함)
- docs/evidence/ledger.md 갱신

코드는 작성하지 않는다. Gate를 확인하고 phase-1-report.md를 쓴 뒤 멈춰라.
```

---

## [2] Phase 2 — PHP → Next.js 마이그레이션 계약

```
Phase 2를 진행한다. 역할: Migration Architect.

docs/legacy/ 전체와 docs/evidence/ledger.md를 읽고,
legacy-unknowns.md에 내가 답한 내용을 반영해라.

설계할 것:
1. 레거시 URL → Next.js 라우트 매핑.
   각 URL마다 "같은 경로 유지 / 308 리다이렉트 / 폐기(410)" 중 하나와 이유.
   검색 노출·문자 발송 링크에 쓰였을 가능성이 있는 공개 URL은 유지나 308을 기본으로.
2. PHP 페이지·공통 include → React 컴포넌트 트리 매핑.
3. PHP 폼 → Server Action 또는 Route Handler 매핑.
   외부에서 호출될 수 있는 것은 Route Handler, 내부 폼은 Server Action.
4. 세션·인증 대체 구조 (관리자 로그인, RBAC 역할 정의).
5. 도메인 서비스: 상담 신청, 설명회 신청, 예약(정원·마감·취소·상태 전환).
   상태 전환은 상태 다이어그램으로.
6. DB 결정: PostgreSQL+Prisma 신규 구축 vs 기존 MySQL 연결.
   기존 데이터 확보 여부에 따라 두 안을 비교하고 추천안 제시 → ADR로 기록.
7. schema.prisma 초안 (개인정보 컬럼 표시, 보존 기간 메모).
8. 자산 이관·이미지 최적화 전략.
9. SEO 메타데이터 보존·리다이렉트 전략.
10. 알림(문자·메일) 어댑터 인터페이스와 공급사 후보 (결정은 내가 한다).
11. 기능 ID별 테스트 계약: 입력, 기대 출력, 오류 케이스, 근거 등급.

규칙:
- 관찰된 동작은 보존. 추론한 서버 로직은 INFERRED로 표시.
- 트랜잭션과 권한 확인은 반드시 서버.
- 모듈형 모놀리스. 불필요한 의존성 추가 금지.

산출물 (docs/contracts/):
- migration-matrix.md (기능 ID × 레거시 동작 × 신규 구현 × 근거 등급 × 테스트)
- route-compatibility-map.json
- schema.prisma (prisma/에도 복사)
- openapi.yaml (Route Handler 대상)
- architecture.md
- migration-risks.md
- docs/decisions/ADR-*.md

구현은 시작하지 않는다. phase-2-report.md에
"내가 승인해야 할 결정 목록"을 따로 정리하고 멈춰라.
```

---

## [3·4] Phase 3–4 — 프론트엔드·백엔드 병렬 구현

> Phase 2 계약이 승인된 뒤, 메인 세션에서 아래 **조정 프롬프트**를 넣고,
> 각 worktree에서 **FE / BE 프롬프트**를 별도 세션으로 실행합니다.

### 조정 프롬프트 (메인 세션)

```
Phase 3–4를 시작한다. 역할: Orchestrator.

1. 승인된 docs/contracts/를 기준으로 src/lib/contracts/에
   공유 타입(Zod 스키마 + 추론 타입)을 먼저 만들고 main에 병합.
2. worktree 두 개 생성:
   - ../munsayu-v2-fe  (브랜치 feat/frontend)
   - ../munsayu-v2-be  (브랜치 feat/backend)
3. 파일 소유권 표를 docs/reports/phase-3-4-ownership.md에 작성:
   FE = app/(public)/**, src/components/**, public/**, tests/visual/**
   BE = app/api/**, app/admin/**, src/server/**, prisma/**, tests/integration/**
   공유 = src/lib/contracts/** (변경 시 양쪽 승인 필요)
4. 기능 ID별 진행 상태표 docs/reports/migration-status.md 생성.
각 worktree에 넣을 프롬프트를 출력하고 멈춰라.
```

### Frontend Migration Engineer (FE worktree)

```
너는 Frontend Migration Engineer다. 작업 위치: ../munsayu-v2-fe

기준: docs/contracts/, docs/legacy/ 스크린샷, CLAUDE.md 7장.

할 일:
- migration-matrix.md의 PG-* 기능을 React로 재구현.
- 레거시 디자인과 관찰된 상호작용을 그대로 보존 (레이아웃, 문구, 순서).
- Server Component 기본, 상호작용만 Client Component.
- route-compatibility-map.json대로 경로와 308 리다이렉트 구현.
- 페이지별 generateMetadata로 SEO 이식.
- 권리 확인된 이미지만 next/image로 최적화.
- 폼 UI는 src/lib/contracts/의 Zod 스키마로 클라이언트 검증.
  서버 연결은 계약에 정의된 Server Action 시그니처만 사용하고,
  BE가 아직 없으면 계약 타입을 따르는 개발용 스텁을 쓰되 스텁임을 명시.
- 페이지마다 Playwright Test 시각 회귀 테스트 (1440 / 390, 레거시 스크린샷 대비).
- 개발 서버 오류·라우트 확인은 Next.js DevTools MCP를 먼저 써라.
- 라이브러리 API가 확실하지 않으면 Context7(연결된 경우)로 문서를 확인해라.

금지: src/server/**, prisma/** 수정. 계약 변경이 필요하면 멈추고 보고.
기능 하나 끝날 때마다 migration-status.md 갱신, 커밋.
```

### Backend Replacement Engineer (BE worktree)

```
너는 Backend Replacement Engineer다. 작업 위치: ../munsayu-v2-be

기준: docs/contracts/ (openapi.yaml, schema.prisma, 상태 다이어그램), CLAUDE.md 7장.

할 일:
- FM-*, BZ-*, AD-* 기능 구현.
- Prisma 마이그레이션 생성, seed는 가짜 데이터만.
- 서비스 계층(src/server/services/)에 신청·예약·상태 전환 로직.
- 정원 확인 + 저장을 단일 트랜잭션으로. 동시 신청 테스트 필수
  (예: 정원 10명에 20건 동시 요청 → 정확히 10건 성공).
- 모든 입력 Zod 검증, idempotency key로 중복 제출 방지.
- 관리자 인증·세션·RBAC. 서버에서 매 요청 권한 확인.
- 개인정보는 로그 금지, 관리자 목록에서 기본 마스킹.
- 알림은 어댑터 인터페이스 + 개발용 콘솔 어댑터.
- 기능 ID별 통합 테스트 (정상, 검증 실패, 정원 초과, 중복 제출, 권한 없음).
- 개발 서버 오류 확인은 Next.js DevTools MCP를 먼저 써라.
- Prisma MCP를 쓴다면 로컬 개발 DB에서만 (TOOLING.md 3장 주의 참고).

금지: 성공 응답 위조, 레거시 PHP 서버 호출, app/(public)/** 수정.
계약 변경이 필요하면 멈추고 보고.
기능 하나 끝날 때마다 migration-status.md 갱신, 커밋.
```

### 통합 프롬프트 (메인 세션, 양쪽 완료 후)

```
FE·BE 브랜치를 통합한다.
1. 각 브랜치 CI 통과 확인 후 main에 순서대로 병합 (BE → FE).
2. FE의 개발용 스텁을 실제 Server Action/API로 교체.
3. 전체 E2E: 기능 ID별 사용자 흐름이 신규 DB에 실제로 저장되는지 확인.
4. Phase 3 Gate와 Phase 4 Gate를 각각 확인.
phase-3-report.md, phase-4-report.md를 작성하고 멈춰라.
```

---

## [5] Phase 5 — 레거시 동등성 검증

```
Phase 5를 진행한다. 역할: QA Engineer.

도구:
- REA inspect_web_page로 신규 앱(localhost 또는 스테이징) 페이지를 수집하고,
  Phase 1의 레거시 수집 결과와 compare_web_captures로 DOM·접근성·URL 차이 비교.
- REA compare_web_screenshots로 화면 픽셀 비교.
- 반복 실행할 비교는 Playwright Test(tests/parity/)로 코드화해 CI에 넣는다.
- REA 허용 주소(REA_BROWSER_ALLOWED_ORIGINS_JSON)에 신규 앱 주소가 있는지 먼저 확인.

1. 시각 회귀: 모든 PG-*를 레거시 스크린샷과 비교 (1440 / 390).
   차이는 "의도된 개선 / 버그 / 확인 필요"로 분류.
2. 라우트: route-compatibility-map.json의 모든 URL을 신규 앱에 요청해
   상태 코드(200/308/410)와 최종 도착지 확인.
3. 폼: 레거시에서 관찰한 필드·검증 메시지·동의 문구와 신규 화면을 1:1 비교.
   레거시 서버 동작은 제출하지 않았으므로 INFERRED 항목은 INFERRED로 남긴다.
4. 신규 앱 기능 테스트: 신청 → 저장 → 관리자 조회 → 상태 변경 → 알림(콘솔).
5. SEO: title/description/canonical/OG 비교표.
6. 운영 사이트에는 GET과 화면 관찰만. 쓰기 요청 금지.

산출물: docs/reports/legacy-parity-report.md
(기능 ID × 레거시 × 신규 × 결과 × 근거 등급)
phase-5-report.md를 쓰고 멈춰라.
```

---

## [6] Phase 6 — 성능·보안

```
Phase 6을 진행한다. 역할: QA / Performance Engineer.

도구: Chrome DevTools MCP(Lighthouse·성능 트레이스), Lighthouse CI,
k6(스테이징 부하), npm audit 또는 osv-scanner. TOOLING.md 4장 참고.

성능:
- 주요 페이지 Lighthouse (모바일) — LCP, CLS, INP 기록.
  Phase 1에서 기록한 레거시 기준값이 있으면 나란히 비교.
- 번들 분석: 불필요한 Client Component, 큰 의존성 정리.
- 이미지 크기·포맷, 폰트 로딩 최적화.
- DB 쿼리: N+1 확인, 필요한 인덱스 추가.
- 스테이징에서 신청 API 부하 테스트 (운영 금지).

보안:
- 관리자 전 경로 권한 우회 테스트 (비로그인, 낮은 권한).
- 입력 검증 누락, XSS, CSRF(Server Action 포함), 레이트 리밋.
- 쿠키 속성, 보안 헤더(CSP 등), 비밀값 노출 여부.
- 개인정보: 로그·에러 메시지·클라이언트 번들에 노출되는지.
- 의존성 취약점 점검.

산출물: docs/reports/performance-report.md, docs/reports/security-report.md
phase-6-report.md를 쓰고 멈춰라.
```

---

## [7] Phase 7 — 전환 준비 (실제 전환은 사람이)

```
Phase 7을 진행한다. 역할: Release Lead.

자동 운영 전환은 하지 않는다. DNS·프록시 변경은 문서로만 준비한다.

1. 스테이징 배포와 전체 E2E 재실행.
2. 데이터 이관: 확보한 기존 데이터가 있으면 변환 스크립트 + 건수·샘플 검증.
   없으면 "이관 불가 기록" 처리 방안 문서화.
3. 전환 체크리스트: 사전 공지, 레거시 폼 중단 시점, DNS TTL 사전 단축,
   전환 순서, 전환 직후 확인 항목(신청 1건 테스트, 리다이렉트, 분석 스크립트).
4. 롤백 계획: 조건(어떤 지표가 나쁘면), 절차, 전환 중 들어온 신청 데이터 처리.
5. 모니터링: 에러 추적, 업타임, 신청 건수 이상 감지.

산출물: docs/reports/migration-checklist.md, docs/reports/rollback-plan.md
phase-7-report.md를 쓰고 멈춰라. 전환 실행은 내가 승인한 뒤 함께 한다.
```

---

## [R] 독립 리뷰 프롬프트 — 각 Phase 끝에 별도 세션에서

> 작업한 세션의 결론을 보지 않은 새 세션(또는 Codex)에서 돌립니다.

```
너는 Independent Reviewer다. 이 저장소의 작업을 처음 본다.

CLAUDE.md와 docs/MIGRATION_PLAN.md를 읽고,
Phase N의 산출물과 변경된 코드를 검토해라.
docs/reports/phase-N-report.md의 결론은 마지막에만 읽어라.

확인할 것:
1. Gate 체크리스트 항목이 실제로 충족됐는가 (증거 파일·테스트 결과로 확인).
2. OBSERVED로 표시됐지만 증거가 없는 항목.
3. 계약(docs/contracts/)과 구현이 어긋나는 곳.
4. CLAUDE.md 3장 금지 사항 위반 여부.
5. 테스트가 실제 동작을 검증하는가, 가짜 응답으로 통과하는가.
6. 보안·개인정보 문제.

결과를 docs/reports/phase-N-review.md에
"차단 / 수정 권장 / 참고"로 나눠 작성하라. 코드는 고치지 않는다.
```

---

## 보조 프롬프트

**Gate FAIL 후 수정**
```
phase-N-report.md와 phase-N-review.md의 FAIL·차단 항목만 수정해라.
범위 밖 개선은 하지 말고, 수정 후 Gate를 다시 확인해 보고서를 갱신하고 멈춰라.
```

**세션 재개 (컨텍스트가 끊겼을 때)**
```
CLAUDE.md, docs/MIGRATION_PLAN.md, 가장 최근 docs/reports/phase-*-report.md,
docs/reports/migration-status.md를 읽고 현재 Phase와 남은 작업을 요약해라.
요약만 하고 내 지시를 기다려라.
```

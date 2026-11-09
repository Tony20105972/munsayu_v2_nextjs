# Phase 1 보고서 — PHP Black-Box Reconnaissance

## 완료한 작업

- 분석용 Chrome CDP(Chrome 156)·REA·Playwright MCP 연결을 확인하고, `robots.txt`의 `/uAdmin/` 금지를 `EV-0002`로 기록했다.
- `/uAdmin/` 및 `/adm/`은 접속하지 않았다. 공개 메뉴·푸터·모바일 링크 기반으로 공개 경로를 수집했고, `/sitemap.xml`은 404임을 기록했다.
- 대표 공개 화면(홈, 설명회, 대치 시간표·수강예약 모달, 로그인, 가입 약관, 공지 목록)을 GET과 화면 관찰만으로 수집했다.
- 강좌 예약 모달의 필드·동의·보유기간, 설명회 마감 UI, 그누보드형 공개 인증·공지 URL 형식을 문서화했다.
- 공개 관찰을 관리자 범위와 연결했다: `EV-ADM-05` ↔ `AD-007/AD-008`, 설명회 ↔ `AD-003~005`, 회원 ↔ `AD-002`, 외부 진단 링크 ↔ `AD-009` 범위 미확정.

## 변경한 파일

- `docs/evidence/ledger.md`, `docs/evidence/robots.txt`, `docs/evidence/{dom,har,rea,screenshots}/`
- `docs/legacy/legacy-route-map.json`, `legacy-feature-matrix.md`, `legacy-form-contracts.md`, `legacy-assets.json`, `legacy-seo-map.md`, `legacy-unknowns.md`
- `docs/BLUEPRINT.md`, `docs/PHASE.md`
- 관리자 금지 경로를 정정한 `CLAUDE.md`, `docs/MIGRATION_PLAN.md`, `docs/HARNESS_PROMPT.md`, `docs/legacy/legacy-admin-screens.md`

## 이관된 PHP 기능

- 관찰·식별: `PG-001`, `PG-008`, `PG-010`, `PG-012`~`PG-014`, `FM-001`~`FM-003`, `BZ-001`~`BZ-002`, `RT-001`~`RT-003`.
- 관리자 연결: `AD-002`~`AD-005`, `AD-007`~`AD-010`, `AD-013`.

## 실행한 테스트와 결과

- `curl -s http://127.0.0.1:9222/json/list`: 통과 (분석용 Chrome 연결 확인).
- Playwright MCP GET·스크린샷·DOM 수집: 통과 (입력·동의·제출·로그인 없음).
- REA `list_browser_targets`, `inspect_web_page`: 통과 (`EV-0003`, `EV-0005`).
- REA `analyze_web_bundle`: 시간 제한으로 부분 증거만 생성 (`ev_af4ff308bc0cde822013eb06a8ced2e9c00f7a5b171fae46680008031be7c9a1`); 전체 정적 분석 결과는 미완료.
- Playwright 네트워크 기록(`docs/evidence/har/phase1-all-network.md`): 동적 요청 0건, 저장된 관찰에서 운영 사이트로 보낸 POST/PUT/DELETE 0건.

## 남은 UNKNOWN / 알려진 한계

- 공개 메뉴가 아닌 숨은·과거 URL과 모든 상세 페이지는 `/sitemap.xml` 404 및 제출 금지 때문에 완전성을 보장할 수 없다.
- 설명회는 모두 마감 상태여서 실제 예약 폼·참석 인원·서버 마감 규칙을 관찰하지 못했다.
- 강좌 예약의 action/method, 서버 검증, 정원·중복·제출 후 알림은 미관찰이다.
- 외부 Google Forms 진단 신청의 내용·제출 동작은 열지 않았다.
- 모든 공개 페이지의 1440/390 스크린샷과 페이지별 REA 관찰이 아직 완료되지 않았다.

## 사용자 결정이 필요한 항목

- `Q-ADM-01`~`Q-ADM-14` (특히 공개 회원 유지, 설명회·강좌 정원/상태, 개인정보 보존, 문자 업체와 시점, AD-009~011 범위).

## Gate: FAIL

| Gate 항목 | 결과 |
|---|---|
| 내비게이션·푸터·sitemap 공개 URL 전부 route map | 부분 통과 — 메뉴·푸터 수집 및 sitemap 404 기록, 완전성 미확정 |
| 모든 공개 페이지 1440/390 스크린샷 | 실패 — 대표 화면만 완료 |
| 모든 폼의 계약 기록 | 실패 — 설명회 접수 가능 폼·서버 action/method 미관찰 |
| 기능 ID·근거 등급·증거 연결 | 부분 통과 — 수집 범위에는 적용 |
| 모든 공개 페이지 REA 결과 및 폼 번들 분석 | 실패 — 대표 페이지 일부만, 번들 분석 시간 제한 |
| 운영 사이트 쓰기 요청 0건 | 통과 — 0건 |
| 운영자 질문 작성 → 답변 수령 | 대기(사람 작업) — 질문은 준비됨 |

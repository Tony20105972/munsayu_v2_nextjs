# MUNSAYU V2 — 작업 규약 (Claude Code / Codex 공통)

> 저장소 루트에 둡니다. Claude Code는 세션마다 자동으로 읽습니다. Codex용 `AGENTS.md`도 같은 내용입니다.
> **세션을 시작하면 `docs/CONTEXT.md`만 읽습니다.** 다른 문서는 필요한 부분만 grep으로 찾습니다.
> 이 파일에는 **항상 지켜야 하는 규칙만** 둡니다. 상세는 아래 6장의 문서에 있습니다.

---

## 1. 작업 효율 규칙

- 작업 시작 시 docs/CONTEXT.md만 읽는다. 다른 문서는 필요한 부분만 grep으로 찾아 읽는다. docs/legacy/·docs/evidence/ 전체 읽기 금지.
- 큰 파일(로그, HAR, JSON, 빌드 출력)은 grep·head·tail로 필요한 줄만 본다.
- 스크린샷은 파일로 저장만 한다. 이미지를 직접 여는 것은 실패한 비교 항목만.
- 작업 중에는 빠른 검사와 관련 테스트만 돌린다. 전체 테스트는 작업 마지막에 한 번.
- 독립 리뷰는 diff 기준, reviewer 서브에이전트로 한다.
- 이미 확인한 내용을 다시 확인하지 않는다. 같은 명령을 결과 변화 없이 반복하지 않는다.
- 보고는 20줄 이내: 한 일, 결과 수치, 남은 문제, 사람이 할 일. 상세는 보고서 파일에만.
- 지시 범위 밖의 개선은 하지 않고 한 줄 제안만 남긴다.

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

## 4. 개인정보 규칙

- 실제 학생·학부모·신청자 개인정보는 수집·저장하지 않고 테스트·시드 데이터로도 쓰지 않습니다. `prisma/seed.ts`는 가짜 데이터만 넣습니다.
- 개인정보(이름, 연락처 등)는 로그에 남기지 않습니다. 관리자 목록 화면에서는 기본적으로 일부를 가립니다.
- 증거 파일(`docs/evidence/`)에 개인정보가 찍혀 있으면 저장 전에 가립니다. 이미 저장했으면 원본을 폐기합니다.
- 사이트에 법적으로 공개 표시된 사업자 정보(상호, 대표자, 사업자등록번호, 주소, 대표 전화, 대표 이메일, 개인정보 보호책임자)는 가리지 않고 증거로 보관할 수 있습니다. 이 예외는 신청자·학생·학부모·직원 개인의 정보에는 적용하지 않습니다.
- 개인정보를 다루는 관리자 기능은 서버에서 매 요청 권한(RBAC)을 확인하고, 조회·내보내기를 기록합니다. 화면에서 버튼을 숨기는 것은 권한 처리가 아닙니다.
- 비밀값은 `.env`에만 두고 `.env.example`에 키 이름만 적습니다.

---

## 5. Git 규칙

- `main`은 보호 브랜치. 직접 커밋하지 않습니다.
- 작업 단위: `feat/<기능ID>-<짧은설명>`, `docs/phase-N`, `fix/...`
- 병렬 작업은 Git worktree로 분리합니다 (`../munsayu-v2-fe`, `../munsayu-v2-be`).
- 프론트·백엔드가 같은 파일을 동시에 고치지 않습니다. 공유 지점은 `src/lib/contracts/`의 타입과 `docs/contracts/openapi.yaml`뿐이며, 계약을 바꾸려면 먼저 계약 문서를 수정하고 사용자 승인을 받습니다.
- CI(타입체크·린트·테스트)가 통과해야 병합합니다.

---

## 6. 상세 문서 (필요한 부분만 grep으로 읽습니다)

| 찾는 것 | 문서 |
|---|---|
| 현재 Phase·확정 결정·유효 ASM·기능 ID 상태·명령 | `docs/CONTEXT.md` |
| Phase 게이트 기준·Phase 운영 규칙·보고서 형식·기능 ID 규칙 | `docs/MIGRATION_PLAN.md` (6·10·11장) |
| 기술 스택·코드 규칙·디렉터리 구조·설계 원칙 | `docs/BLUEPRINT.md` (14장) |
| 도구 우선순위(REA → Playwright)·레거시 조사 규칙 | `docs/TOOLING.md` (1·8장) |
| Phase 상태판·결정표·운영자 질문 | `docs/PHASE.md` |
| ASM 전문과 원장님 질문 | `docs/reports/open-questions.md` |
| 되돌리기 어려운 결정 | `docs/decisions/ADR-00*.md` |
| 로컬 실행·환경 변수 키·첫 관리자 계정 | `docs/LOCAL_DEV.md` |
| 직원용 사용 설명서(사진 올리기·삭제·숨기기) | `docs/ADMIN_GUIDE.md` |
| Phase별 프롬프트·승인 프롬프트 | `docs/HARNESS_PROMPT.md` · `docs/EXECUTION_PROMPTS.md` |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

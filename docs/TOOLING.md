# MUNSAYU V2 — 도구 구성 (MCP · 테스트 도구)

> **원칙**
> - 레거시 분석은 **REA**, 브라우저 조작·테스트는 **Playwright**를 가장 먼저 씁니다. 다른 도구는 이 둘이 못 하는 일에만 씁니다.
> - 도구 이름은 버전에 따라 바뀔 수 있습니다. Phase 0에서 `/mcp`로 실제 도구 목록을 확인하고, 이 문서와 다르면 **문서를 실제에 맞게 고칩니다.** 없는 도구를 있다고 가정하지 않습니다.
> - 도구를 더 넣을수록 컨텍스트를 차지합니다. 3장 표의 "쓰는 Phase"에서만 켭니다.

---

## 1. 필수 도구

### 1.1 REA — 레거시 사이트 분석 (최우선)

소스 없이 웹사이트·JS 번들·네트워크 기록을 분석하고, 결과마다 증거(Evidence ID)를 붙여 돌려주는 역분석 MCP입니다. 이 프로젝트의 "증거 기반 블랙박스 분석"과 방식이 그대로 맞습니다.

**설치**
```bash
npx -y rea-agents@latest setup   # Claude Code·Codex에 REA MCP 등록
rea doctor                        # 설치 상태 점검
# 등록 후 Claude Code를 완전히 종료했다가 다시 실행해야 도구가 보입니다
```

**웹 분석 설정** — 웹 관찰 기능은 기본으로 꺼져 있고, 허용한 주소만 볼 수 있습니다. REA MCP 서버의 환경 변수로 넣습니다.
```bash
REA_BROWSER_OBSERVE_ENABLED=true
REA_BROWSER_CDP_ENDPOINTS_JSON='["http://127.0.0.1:9222"]'
REA_BROWSER_ALLOWED_ORIGINS_JSON='["https://munsayu.com","http://localhost:3000"]'
# www.munsayu.com 등 다른 주소가 쓰이면 Phase 1에서 확인 후 추가
```

**분석 전용 Chrome 실행** (Mac 기준, 평소 쓰는 Chrome 프로필과 분리)
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.munsayu-rea-chrome"
```

**이 프로젝트에서 쓰는 REA 도구**

| 도구 | 하는 일 | 쓰는 곳 |
|---|---|---|
| `list_browser_targets` | 분석용 Chrome에 열린 페이지 찾기 | Phase 1, 5 |
| `inspect_web_page` | DOM 구조, 접근성 트리, 스크립트·리소스, 네트워크·콘솔 메타데이터 수집 | Phase 1 페이지·폼 조사 |
| `analyze_web_bundle` | 로드된 스크립트를 실행하지 않고 분석해 **경로·API 엔드포인트 후보** 추출 | Phase 1 폼·AJAX 동작 추정 |
| `export_web_scripts` → `analyze_javascript_application` | 수집한 스크립트를 파일로 내보내 모듈·호출 관계 분석 | Phase 1 상호작용 로직 파악 |
| `inspect_web_network_capture` | 저장된 HAR 파일을 오프라인으로 분석 (다시 요청하지 않음) | Phase 1 요청/응답 계약 |
| `capture_web_screenshot` | 증거용 화면 캡처 | Phase 1 |
| `compare_web_captures` | 두 수집 결과의 DOM·접근성·URL·이벤트 차이 비교 | Phase 5 레거시 vs 신규 |
| `compare_web_screenshots` | 두 화면의 픽셀 비교 | Phase 5 |
| `capture_browser_scenario` | REA가 브라우저를 띄워 정해 둔 클릭을 실행하며 네트워크 기록 | Phase 1 (아래 제한 준수) |

**REA 사용 규칙**
- 결과가 큽니다(페이지 하나에 수만~십만 토큰). 결과는 `docs/evidence/rea/`에 파일로 저장하고 요약만 읽습니다.
- REA의 `evidence_id`를 `docs/evidence/ledger.md`의 `EV-xxxx`와 짝지어 기록합니다.
- `capture_browser_scenario`에는 메뉴·탭·모달 열기 같은 **화면 이동 클릭만** 넣습니다. 제출 버튼 클릭, 폼 입력은 넣지 않습니다.
- REA는 관찰을 시작한 뒤부터만 기록합니다. "요청이 안 보였다"는 "요청이 없다"는 증거가 아닙니다 → `UNKNOWN`.
- 분석 결과는 AI 모델로 전달됩니다. 개인정보가 보이는 화면은 분석하지 않습니다.

### 1.2 Playwright — 브라우저 조작과 테스트

두 가지를 함께 씁니다.

| 구분 | 용도 | 설치 |
|---|---|---|
| **Playwright MCP** | Claude가 직접 브라우저를 움직이며 탐색: 메뉴 따라가기, 반응형 확인, 모달·탭 동작, HAR 기록 | `claude mcp add playwright -- npx -y @playwright/mcp@latest --isolated` |
| **Playwright Test** (`@playwright/test`) | 코드로 남는 테스트: E2E, 시각 회귀(`toHaveScreenshot`), 리다이렉트, 레거시 비교, CI | 프로젝트 devDependency |

- 운영 사이트를 볼 때는 `--isolated`로 실행해 쿠키·세션이 남지 않게 합니다.
- Playwright로 레거시 흐름을 따라가며 HAR를 저장하고, 그 HAR를 REA `inspect_web_network_capture`로 분석하는 것이 기본 조합입니다.

### REA와 Playwright의 역할 분담

| 작업 | 먼저 쓸 도구 | 보조 |
|---|---|---|
| 페이지 목록 수집, 메뉴·링크 따라가기 | Playwright MCP | — |
| 페이지 구조·폼 필드·리소스 분석 | REA `inspect_web_page` | Playwright 스냅샷 |
| JS가 호출하는 주소·폼 처리 추정 | REA `analyze_web_bundle` | — |
| 사용자 흐름 따라가며 네트워크 기록 | Playwright MCP (HAR 저장) | REA 시나리오 |
| 네트워크 기록 분석 | REA `inspect_web_network_capture` | — |
| 반응형 스크린샷 (1440 / 390) | Playwright | REA 스크린샷 |
| 신규 앱 E2E·시각 회귀·CI | Playwright Test | — |
| 레거시 vs 신규 동등성 비교 | REA `compare_web_captures` / `compare_web_screenshots` | Playwright Test |

---

## 2. 권장 도구

| 도구 | 하는 일 | 쓰는 Phase | 설치 |
|---|---|---|---|
| **Chrome DevTools MCP** (Google) | Lighthouse 감사, 성능 트레이스(Core Web Vitals), 네트워크·콘솔 상세, 기기 에뮬레이션 | 1(레거시 성능 기준값), 6 | `claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --no-usage-statistics` |
| **Next.js DevTools MCP** (Vercel) | 실행 중인 Next.js 개발 서버의 오류·라우트·로그 확인, 공식 문서 검색. **Next.js 16 이상 필요** | 3, 4 | `claude mcp add next-devtools -- npx -y next-devtools-mcp@latest` |
| **Context7** (Upstash) | Prisma·Zod·Tailwind 등 라이브러리의 최신 버전 문서를 가져와 잘못된 API 사용을 줄임 (API 키 필요) | 2, 3, 4 | `npx ctx7 setup --claude` |
| **GitHub CLI** (`gh`) | PR 생성, CI 결과 확인 | 전체 | 이미 쓰고 있다면 별도 MCP 불필요 |

- Chrome DevTools MCP는 기본으로 Google에 사용 통계를 보냅니다. 위 명령처럼 `--no-usage-statistics`를 붙입니다.
- Chrome DevTools MCP가 띄우는 Chrome과 REA용 분석 Chrome(포트 9222)은 따로 둡니다.

---

## 3. 조건부 도구 (결정에 따라)

| 도구 | 조건 | 쓰는 Phase | 주의 |
|---|---|---|---|
| **Prisma MCP (로컬)** `npx -y prisma mcp` | D2 = PostgreSQL+Prisma | 4 | `migrate-reset` 도구가 있어 DB를 지울 수 있습니다. **로컬 개발 DB에서만** 쓰고, 스테이징·운영 연결 정보가 있는 환경에서는 켜지 않습니다 |
| **Vercel MCP** | D3 = Vercel | 6, 7 | 배포 로그·런타임 오류 확인용. 운영 승격·도메인 변경은 사람이 승인 |
| **Sentry MCP** `@sentry/mcp-server` | 에러 추적 도구로 Sentry를 고른 경우 | 6, 7 | 읽기 권한 토큰으로 시작 |

---

## 4. MCP가 아닌 테스트·점검 도구

| 도구 | 용도 | 쓰는 Phase |
|---|---|---|
| `@axe-core/playwright` | Playwright 테스트 안에서 접근성 자동 점검 | 3, 5 |
| Lighthouse CI | PR마다 성능 점수 기록, 기준 미달 시 실패 | 6 |
| k6 | 신청 API 부하·동시성 테스트 (스테이징 전용) | 6 |
| `npm audit` 또는 osv-scanner | 의존성 취약점 점검 | 6 |

---

## 5. Phase별 도구 사용표

| Phase | 반드시 | 필요하면 |
|---|---|---|
| 0 | REA(`rea doctor`, 도구 목록 확인), Playwright MCP·Test | Chrome DevTools, Next.js DevTools, Context7 연결 확인 |
| 1 | **REA**, **Playwright MCP** | Chrome DevTools (레거시 Lighthouse 기준값) |
| 2 | — (문서 작업) | Context7 |
| 3 | Playwright Test (시각 회귀), Next.js DevTools | Context7, axe |
| 4 | Playwright Test, Next.js DevTools | Prisma MCP(로컬), Context7 |
| 5 | **REA** 비교 도구, **Playwright Test** | axe |
| 6 | Chrome DevTools, Lighthouse CI, k6 | Vercel·Sentry MCP |
| 7 | Playwright Test (스테이징 E2E) | Vercel·Sentry MCP |

---

## 6. 넣지 않는 것

- **범용 크롤링·스크래핑 MCP** (Firecrawl, Browserless 등): REA와 Playwright로 충분하고, 운영 사이트에 요청을 더 많이 보내게 됩니다.
- **DB에 직접 붙는 범용 SQL MCP**: Prisma로 충분하고, 잘못 붙으면 운영 데이터를 건드릴 위험이 있습니다.
- **같은 일을 하는 도구 두 개**: 예를 들어 Playwright MCP와 Puppeteer MCP를 함께 넣지 않습니다.

---

## 7. 프로젝트 공유 설정 예시 (`.mcp.json`)

저장소 루트에 두면 Claude Code가 프로젝트를 열 때 이 서버들을 씁니다. REA는 `rea-agents setup`이 등록하므로 여기에 넣지 않습니다. 비밀값은 파일에 쓰지 않고 환경 변수로 넘깁니다.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--isolated"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"]
    },
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

- Phase 0 보고서에 각 도구의 실제 버전을 기록합니다. 작업 중 도구가 갑자기 바뀌는 것을 막으려면, Phase 0이 끝난 뒤 `@latest`를 확인된 버전으로 고정합니다.
- Codex에서도 같은 서버를 쓰려면 `~/.codex/config.toml`에 같은 명령으로 등록합니다.

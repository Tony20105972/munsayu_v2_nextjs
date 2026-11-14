# Phase 5 독립 리뷰 — diff 기준

> 대상 `git diff main...feat/admin-media` (커밋 3개) · 2026-11-14 · reviewer 서브에이전트
> 판정: **차단 1 / 권장 5 / 참고 4**

---

## 차단 1건 — 수정 완료

### 홈 배너의 숨은 슬라이드가 클릭과 초점을 가로챘다

`src/components/home/hero.tsx` · `app/globals.css`

세 장을 같은 격자 칸에 겹쳐 두고 **`opacity` 만** 바꾸고 있었다. 투명해져도 클릭 대상과
탭 순서에는 그대로 남아 있어, DOM 마지막인 3번 슬라이드가 배너 전체를 덮었다.

Phase 5 에서 슬라이드마다 **버튼 주소를 다르게** 복원하면서(EV-0015) 이 결함이 겉으로
드러났다. 1번 슬라이드의 「문해력 진단 신청」(`/sub/abouttch3`)을 눌러도 3번 슬라이드의
`/sub/about` 로 갔다. 또 `aria-hidden="true"` 안에 초점 가능한 링크가 있어 키보드
사용자는 읽히지 않는 링크에 초점이 들어갔다(WCAG 4.1.2).

**수정:** `opacity` 와 함께 `visibility` 를 바꾼다. `visibility: hidden` 은 클릭 대상과
탭 순서에서 모두 빠진다. 움직임 줄이기 설정에서도 같은 규칙을 적용했다.

**확인:** 실제 브라우저에서 1번 슬라이드 CTA 를 눌러 `/sub/abouttch3` 로 가는 것을
확인했다. 고치기 전에는 같은 자리가 `/sub/about` 로 갔다.

---

## 권장 5건 — 3건 수정, 2건 기록

| # | 내용 | 처리 |
|---|---|---|
| 1 | `tests/e2e/global-setup.ts` 의 `deleteMany` 범위를 넓혔는데 운영 보호 장치가 없다 | **수정.** `assertDisposableDatabase()` 추가 — `NODE_ENV=production`·`VERCEL`·로컬이 아닌 `DATABASE_URL`(CI 제외)이면 멈춘다 |
| 2 | `AUTH_SECRET` 이 없으면 업로드 티켓 서명 키가 공개 상수가 되어 티켓을 위조할 수 있다 | **수정.** `requireEnvValue("AUTH_SECRET")` 로 바꿔 비밀값이 없으면 멈춘다 |
| 3 | `src/lib/contracts/media.ts` 의 `isVisible: z.coerce.boolean()` 이 같은 파일의 경고와 어긋난다 | **수정.** `z.boolean()` 으로 바꿨다. 문자열 변환은 Server Action 의 `readBoolean()` 이 맡는다 |
| 4 | `src/components/admin/media-panels.tsx` — 버튼이 `disabled` 면 확인창이 열리지 않아 「쓰는 중」 설명이 보이지 않는다 | **기록.** 화면 개선 항목이라 Phase 6 로 넘긴다 |
| 5 | `src/server/services/media.ts` 사용처 검사가 트랜잭션 밖이라 동시 삭제 시 결과 문구가 `in-use` 가 아니라 `file` 로 잘못 안내된다 | **기록.** FK `onDelete: Restrict` 가 실제 삭제는 막는다. 안내 문구 분류만 어긋나므로 Phase 6 로 넘긴다 |

`tokens.ts` 의 `AUTH_SECRET` pepper 도 같은 성격(없으면 조용히 약해짐)이다. 로그인
흐름 전체에 영향이 가는 변경이라 이번에는 건드리지 않고 Phase 6 보안 점검으로 넘긴다.

---

## 참고 4건

- `vercel.json` 의 `main: true` 는 main 푸시 시 운영 배포가 켜진다는 뜻이다. 레거시 전환
  전까지 운영 배포가 바깥에 노출되지 않도록 Vercel 쪽 로그인 보호를 켜 두어야 한다(Phase 7).
- `playwright.config.ts` 의 `reuseExistingServer: false` 는 **CI 동작을 바꾸지 않는다.**
  CI 는 `process.env.CI` 때문에 이미 `false` 였다. 로컬에서 3000 포트가 선점됐을 때
  바로 실패하는 것만 달라진다.
- `app/robots.ts` 는 레거시(EV-0002)와 동등하고 신규 경로를 더 막는다. 색인 차단이
  접근 제어가 아니라는 주석도 있다.
- `CLAUDE.md` 가 「`AGENTS.md` 도 같은 내용」이라고 적었지만 `AGENTS.md` 에는 Next 가
  자동으로 넣는 블록이 더 있다(해당 블록에 설명 주석이 있어 혼동 소지는 작다).

증거 등급 표기(EV-0015·ledger·ASM-081/048/095/096), 증거 파일의 강사 실명 가림,
`unstable_rethrow` 를 `AppError`·`ZodError` 처리보다 앞에 둔 것은 문제가 없었다.

---

## 수정 뒤 검증

`npm run verify:all` 통과 — assets · typecheck · lint · 단위/통합 369 · E2E 52 · 시각 회귀 104

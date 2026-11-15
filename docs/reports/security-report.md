# 보안 보고서 — Phase 6

> 로컬 프로덕션 빌드 기준. 운영 사이트에는 접속하지 않았다.
> 등급: **차단** = 고치기 전에는 넘어갈 수 없음 · **권장** = 고치면 좋음 · **확인** = 이미 안전함을 확인

---

## 결과 요약

| 등급 | 건수 |
|---|---|
| 차단 — 고쳤다 | **2** |
| 권장 — 고쳤다 | **2** |
| 확인 — 이미 안전했다 | 10 |

---

## 차단 2건 (고침)

### S1. 보안 헤더가 하나도 없었다

응답 헤더를 직접 받아 보니 `Content-Security-Policy`·`Strict-Transport-Security`·
`X-Content-Type-Options`·`Referrer-Policy`·`X-Frame-Options`·`Permissions-Policy` 가
**전부 없었다.** 대신 `X-Powered-By: Next.js` 가 나가고 있었다.

없을 때 생기는 일:
- 공지 본문 정리기(ADR-006)를 뚫는 XSS 가 하나라도 생기면 막을 2차 방어선이 없다
- 다른 사이트가 우리 관리자 화면을 iframe 으로 끼워 클릭을 가로챌 수 있다
- 첫 접속이 http 로 가도 막히지 않는다

**고친 방법** — `proxy.ts` 에서 모든 응답에 붙인다. matcher 를 전 경로로 넓혔고
레거시 주소 처리(RT-001/002/004)는 **먼저** 끝나므로 동작이 바뀌지 않는다(308·410 확인).
리다이렉트·410 응답에도 헤더를 붙이고, 사용자가 올린 파일 경로(`/uploads`)도 포함했다 —
`nosniff` 가 가장 필요한 자리다.

```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'
  https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: …;
  font-src 'self'; connect-src 'self' …; frame-ancestors 'none'; base-uri 'self';
  form-action 'self'; object-src 'none'; upgrade-insecure-requests
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
x-frame-options: DENY
permissions-policy: camera=(), microphone=(), geolocation=(), payment=()
```

#### nonce 를 쓰려다 되돌린 경위 (중요)

처음에는 요청마다 nonce 를 만들어 `'strict-dynamic'` 과 함께 썼다. 개발 서버 기준
E2E 가 전부 통과해 괜찮아 보였지만, **운영 빌드에서 직접 확인하니 화면당 11~13건씩
모두 62건의 스크립트가 막혔다.**

이유는 두 가지가 겹쳤다.
1. 이 앱은 `cacheComponents` 로 화면을 **미리 만들어 둔다.** 미리 만든 HTML 에는
   요청마다 달라지는 nonce 를 넣을 수 없다.
2. `'strict-dynamic'` 이 있으면 CSP3 브라우저는 `'self'` 를 **무시한다.** 그래서
   nonce 가 없는 그 스크립트들이 전부 막혔다.

미리 만들기를 끄면 이번에 얻은 LCP 개선(2.9초 → 0.6초)이 날아간다. 그래서 nonce 를
버리고 `script-src 'self' 'unsafe-inline'` 으로 갔다.

**이 선택의 한계를 분명히 적는다.** 바깥 주소에서 스크립트를 불러오는 일(가장 흔한
주입 경로)과 `object-src`·`base-uri`·`form-action`·`frame-ancestors` 는 여전히 막지만,
**본문에 끼워 넣은 스크립트는 CSP 가 막지 못한다.** 그 자리는 공지 본문 정리기
(ADR-006, 저장·읽기·가져오기 세 곳)가 맡는다.

운영 빌드에서 공개 화면 5개를 열어 **CSP 위반 0건·수화 정상**을 확인했다.
더 조이려면 미리 만들기를 포기해야 하므로 Phase 7 에서 `Report-Only` 로 지켜본 뒤
결정한다.

### S2. CSV 내보내기에 건수 상한이 없었다

내보내기 4개가 모두 조건에 맞는 **모든 줄**을 메모리에 올려 한 덩어리로 만들었다.
필터 없이 한 번 누르면 개인정보가 담긴 표 전체가 한 파일로 빠져나가고, 함수 메모리
한계에 걸릴 수도 있다.

조용히 잘라내면 「현재 필터 결과 전체」라는 약속(ASM-006)이 거짓이 된다. 그래서 2만 줄을
넘으면 **거절하면서 범위를 좁히라고 알려 준다.** // ASM-097

세어 보고 다시 읽는 두 번 질의 대신 **한 번에 상한+1 만큼 읽는다**(`src/server/lib/csv-export.ts`).
질의 사이에 줄이 늘어나는 경합이 없고, 메모리에 올라오는 양이 실제로 묶인다.
거절 문구에는 상한만 담고 실제 건수도 개인정보도 넣지 않는다. 단위 테스트 5건으로
경계값(상한=통과 / 상한+1=거절)과 문구를 확인한다.

---

## 권장 2건 (고침)

### S3. 만료된 관리자 세션을 확인하는 테스트가 없었다

코드는 유효기간을 보고 있었지만(`session.expiresAt <= now → null`) **그걸 확인하는
테스트가 없었다.** 누가 그 줄을 지워도 아무도 모른다.

관리자 경로 50개 전부에 「만료된 쿠키 → 401」 테스트를 추가했다. 이제 경로마다
비로그인 401 · 회원 403 · **만료 401** 세 가지를 확인한다. (통합 테스트 414건)

### S4. 색인에서 빼야 할 경로가 sitemap 기준과 따로 놀 뻔했다

`sitemap.xml` 을 새로 만들면서 관리자·회원 개인 화면·내부 API·올린 파일을 뺐고,
`robots.txt` 의 차단 목록과 같은 기준을 쓰도록 양쪽 주석에 서로를 적어 두었다.

---

## 확인 10건 — 이미 안전했다

| # | 항목 | 확인한 내용 |
|---|---|---|
| 1 | 관리자 권한 우회 | 경로 50개에 대해 비로그인 401 / 회원 403 / 만료 401. 화면에서 버튼을 숨기는 방식이 아니라 서버가 매 요청 확인한다 |
| 2 | XSS — 공지 본문 | `sanitize-html` 로 **저장할 때·읽을 때·레거시 가져올 때** 세 곳 모두 정리한다. 한 곳이 빠져도 나머지가 막는다 |
| 3 | XSS — 신청자 입력 | 관리자 목록은 이름·연락처를 가려서 보여 주고, 원문 보기는 따로 기록을 남긴다. React 가 기본으로 이스케이프한다 |
| 4 | CSRF | Next 기본 Origin 검사가 동작하는 것을 **직접 확인**했다. 외부 출처로 Server Action 을 호출하니 `does not match origin header … Aborting the action` 으로 거절됐다 |
| 5 | 요청 횟수 제한 | 공개 Server Action 과 API 전반에 적용. 부하 테스트에서 60회/60초가 정확히 걸렸다(201 60건 / 429 140건) |
| 6 | 업로드 — 형식 위장 | 확장자·Content-Type 을 믿지 않고 **파일 내용(매직 바이트)** 으로 가린다 |
| 7 | 업로드 — SVG | 받지 않는다. 안에 스크립트를 넣을 수 있다 |
| 8 | 업로드 — 이력서 | 저장소의 **비공개 영역**에 둔다. 공개 주소가 없고 관리자 인증 경로로만 내려받으며 내려받기마다 기록을 남긴다 |
| 9 | 쿠키 | `HttpOnly` · `SameSite=Lax` · `Path=/` · 운영에서 `Secure`. 회원 쿠키와 관리자 쿠키가 분리돼 있다 |
| 10 | 비밀값·개인정보 노출 | 운영 번들에 비밀값 문자열 **0건**, 소스맵 **미출력**, 오류 응답·로그는 오류 **이름만** 남긴다, 개인정보 조회·내보내기는 기록을 남긴다 |

---

## 의존성 취약점

```
7 moderate · 0 high · 0 critical
```

**높음 이상 0건.** 지시 기준(높음 이상 수정)에 해당하는 항목이 없다.
7건은 모두 `@typescript-eslint/*` 계열의 개발 전용 의존성이고 운영 번들에 들어가지 않는다.

---

## 남은 것 / 다음 단계에서 볼 것

| 항목 | 왜 미뤘나 |
|---|---|
| `AUTH_SECRET` 이 없을 때 세션 토큰 해시의 pepper 가 빈 값이 된다 (`tokens.ts`) | 업로드 티켓 쪽은 Phase 5 에서 필수로 바꿨다. 토큰 쪽은 로그인 흐름 전체에 영향이 가는 변경이라 따로 다룬다 |
| 운영 환경의 실제 헤더 적용 확인 | 스테이징이 Phase 7 에서 선다. Vercel 이 헤더를 덮지 않는지 그때 확인한다 |
| 보존 기간 파기 예약 실행 | 예약 실행 설정 자체가 Phase 7 항목이다. 기능과 기록은 통합 테스트로 확인돼 있다 |
| CSP 를 보고서 모드로 한번 돌려 보기 | 운영에서 막히는 자원이 없는지 `Content-Security-Policy-Report-Only` 로 며칠 지켜보는 편이 안전하다 |

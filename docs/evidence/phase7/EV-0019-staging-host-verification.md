# EV-0019 — 스테이징 호스트에서 실제로 돌려 확인한 것 (Phase 7 Gate 1·2·4)

- 날짜: 2026-11-15 ~ 2026-11-16
- 등급: `OBSERVED`
- 대상: **스테이징 호스트** `https://munsayu-v2-nextjs.vercel.app`
  (Vercel 프로젝트 `munsayu-v2-nextjs` 의 **production 환경**. 커스텀 도메인은 붙이지 않았다.
  munsayu.com 은 이 계정의 도메인 목록에 없다 — 운영 사이트를 건드리지 않았다)
- 방법: `vercel deploy --prod` · `vercel rollback` / `promote` · `npm run e2e:staging` ·
  `curl` · Playwright(`tests/staging/blob-upload.spec.ts`) · `vercel inspect --logs` · `vercel logs`
- 데이터베이스: Neon `neondb` (`ep-sweet-forest-bc8x6h4f`). **스테이징 전용**이다 (D10 · ADR-009)

> `EV-0016` 은 같은 점검을 **로컬 운영 빌드**로 돌린 기록이다. 이 기록이 그것을 대신한다.
> 스테이징 호스트에서 처음 돌려 **결함 7건**이 드러났고, 그중 4건은 로컬에서는 드러날 수
> 없는 종류였다(저장소·보안 헤더·배포 환경 변수).

---

## 1. 스테이징을 세운 순서와 결과

| 순서 | 한 일 | 결과 |
|---|---|---|
| 1 | `vercel env pull --environment=production .env.staging` | 받음. 민감 변수 9개는 `[SENSITIVE]` 로 가려져 온다 |
| 2 | `DOTENV_CONFIG_PATH=.env.staging node scripts/migrate-deploy.mjs` | 마이그레이션 **4건 적용**. 적용 전 `migrate status` 는 「4건 미적용」이었다 — **스테이징 DB 에는 표가 하나도 없었다** |
| 3 | `npm run db:seed` | 기존 사이트 사진 33장 등록, 가짜 관리자·회원 1명씩 |
| 4 | `npm run bootstrap:admin` | 아래 2-3 결함을 고친 뒤 `stagingadmin` 생성 |
| 5 | `npm run import:notices -- --dry-run` → 실제 | 레거시 공지 **2건 저장**(제목·작성일 수정 후 — `EV-0018`) |
| 6 | `vercel deploy --prod` | 1차 **실패**(2-1) → 고친 뒤 성공 |

### 1-1. 배포가 마이그레이션을 실제로 적용하는 것 (ASM-099)

Production 빌드 기록 그대로 (`vercel inspect --logs`):

```
2026-11-15T12:36:33.754Z  Running "node scripts/migrate-deploy.mjs && next build"
2026-11-15T12:36:33.814Z  [migrate-deploy] DATABASE_URL_UNPOOLED(직접 접속) 로 마이그레이션을 적용합니다.
2026-11-15T12:36:35.293Z  No pending migrations to apply.
```

- `EV-0017` 은 **Preview 가 건너뛴다**는 것만 보여 줬다. 이 기록은 **Production 이 실제로
  적용 경로를 탄다**는 것을 보여 준다. 두 방향이 모두 확인됐다.
- 「미적용 없음」인 이유는 2번에서 사람이 먼저 적용했기 때문이다. **표를 처음 만드는 것을
  배포가 하는 장면은 아직 보지 못했다** — 운영 DB 는 전환 당일 처음 만들어지므로
  그때가 처음이다 (ADR-009 의 한계).
- 같은 빌드 기록에 `├ ƒ /api/cron/privacy-purge` 가 있다. 예약 경로가 **동적**이다
  (정적으로 굳으면 파기가 아예 돌지 않는다).

---

## 2. 스테이징에서 처음 드러난 결함 7건

### 2-1. `CRON_SECRET` 값에 공백이 있어 **배포가 거부됐다**

```
{"status":"error","reason":"deploy_failed",
 "message":"The `CRON_SECRET` environment variable contains leading or trailing whitespace,
            which is not allowed in HTTP header values."}
```

Vercel 이 이 값으로 `Authorization: Bearer ...` 헤더를 만들기 때문에 공백을 거부한다.
**환경 변수 한 줄이 배포 전체를 막는다.** 값을 공백 없는 48자로 교체해 풀었다.
→ 전환 체크리스트 T-5분 단계에 「값을 붙여넣을 때 끝의 개행을 넣지 않는다」를 적었다.

### 2-2. 보호 우회를 **쿠키로 심으라는 헤더**가 점검 11건을 거짓 실패로 만들었다

`playwright.config.ts` 가 `x-vercel-set-bypass-cookie: true` 를 함께 보내고 있었다.
그러면 Vercel 이 쿠키를 심으려고 **같은 주소로 307 을 한 번 되돌린다.** 리다이렉트를
따라가는 점검(공개 화면 16개)은 통과했지만, `maxRedirects: 0` 으로 **응답 코드 자체를
보는** 점검은 앱의 308·410·401·404 대신 그 307 을 받았다.

```
11 failed  (308 표본 5 · 410 표본 2 · 관리자 401 3 · 파기 예약 404 1)
Expected: 308   Received: 307
Expected: 410   Received: 307
Expected: 404   Received: 307
```

같은 주소를 `curl` 로 헤더만 붙여 부르면 `308 /notice`·`410`·`401`·`404` 가 정확히 나왔다.
→ 설정에서 그 헤더를 빼 **열쇠를 헤더로만** 보낸다. 다시 돌려 **32건 전부 통과.**

### 2-3. `bootstrap:admin` 이 **로그인할 수 없는 관리자**를 만들어 줬다

`BOOTSTRAP_ADMIN_ID=staging-admin` 으로 계정이 **만들어졌다.** 그런데 로그인 화면은
같은 아이디를 거부한다 — `loginIdSchema` 는 영문 소문자·숫자·밑줄만 받는다.

```
textbox "관리자 아이디" [invalid]: staging-admin
paragraph: 아이디는 영문 소문자, 숫자, 밑줄만 쓸 수 있습니다.
```

스크립트는 같은 아이디를 **덮어쓰지 않으므로** 고칠 길도 없었다. 전환 때 운영 첫
관리자를 만드는 **유일한 경로**라서 치명적이다(운영에는 시드를 넣지 않는다 — ADR-009).
→ 스크립트가 아이디·메일·비밀번호를 **로그인과 같은 계약으로** 검사하고, 틀리면 만들기
전에 멈춘다. 임시 비밀번호도 `passwordSchema` 를 만족할 때까지 다시 뽑는다
(56자 알파벳 중 숫자가 8자뿐이라 24자를 뽑아도 숫자가 없을 확률이 약 2% 였다).

확인:
```
BOOTSTRAP_ADMIN_ID 이 로그인 규칙에 맞지 않습니다: 아이디는 영문 소문자, 숫자, 밑줄만 쓸 수 있습니다.
관리자 계정을 만들었습니다: stagingadmin
```

### 2-4. CSP `connect-src` 가 **서명된 PUT 주소를 막아** 사진 올리기가 전부 실패했다

```
사진을 올리지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.

Connecting to 'https://vercel.com/api/blob/?pathname=staging%2Fmedia-staging%2F…'
violates the following Content Security Policy directive:
"connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com".
The action has been blocked.
```

Phase 6 이 보안 헤더를 넣고 Phase 7 이 Blob 어댑터를 넣었는데 **둘을 이어 주는 자리가
비어 있었다.** `img-src` 에만 Blob 호스트를 열어 둬서 **보기는 되고 올리기는 안 되는**
상태였고, 로컬 파일 저장소에서는 이 경로를 지나지 않아 드러나지 않았다.
→ `STORAGE_ADAPTER=vercel-blob` 일 때만 `connect-src` 에 업로드 주소를 더한다.
`tests/unit/security-headers-csp.test.ts` 4건으로 양방향(열림·안 열림)을 고정했다.

배포 뒤 실제 응답 헤더:
```
connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com
            https://vercel.com https://*.public.blob.vercel-storage.com
```

### 2-5. 보호 우회 **헤더**가 저장소로 가는 요청에서 CORS 에 막혔다 (점검 방식 문제)

```
Access to fetch at 'https://vercel.com/api/blob/?…' from origin
'https://munsayu-v2-nextjs.vercel.app' has been blocked by CORS policy:
Request header field x-vercel-protection-bypass is not allowed by
Access-Control-Allow-Headers in preflight response.
```

앱 결함이 아니다 — 실제 방문자는 그 헤더를 보내지 않는다. **점검이 브라우저의 모든
요청에 열쇠를 붙여서** 생긴 일이다. 또한 Playwright Test 는 `browser.newContext()` 에도
설정의 `use` 를 물려주므로 `extraHTTPHeaders: {}` 로 명시해 꺼야 했다.
→ 업로드 점검은 설정을 물려받지 않는 컨텍스트에서 **쿠키 방식**(쿼리 매개변수로 한 번
받기)으로 보호를 지난다. 이 사실을 `tests/staging/blob-upload.spec.ts` 머리말에 적었다.

### 2-6. **Blob 저장소 하나로는 공개·비공개를 함께 담을 수 없었다** (설계 공백)

```
Vercel Blob: Cannot use public access on a private store.
The store is configured with private access.
```

저장소의 공개/비공개는 **만들 때 고정**된다(`vercel blob create-store --access public|private`).
프로젝트에 붙어 있던 저장소는 `"access": "private"` 이었고, 그래서 공개 사진
(`access: "public"`)을 **한 장도 받지 못했다.** ADR-008·Phase 7 어댑터는 한 저장소가
둘을 함께 담는다고 가정하고 있었다.

→ 사용자 결정(2026-11-16): **저장소를 둘로 나눈다.**
- 공개 사진 → 새 public 저장소 `munsayu-v2-public` (`store_R7TSbuJ34VTFch9n`)
- 이력서(AD-011)·검사 전 원본 → 기존 private 저장소 (`store_q6mpBIEX31WZnlQO`)

환경 변수 이름을 **영역별로 나눴다.** 공개 쪽은 `BLOB_PUBLIC_READ_WRITE_TOKEN`·
`BLOB_PUBLIC_STORE_ID` **만** 읽고, 비공개 저장소의 이름으로 흘러가는 길을 만들지 않는다.
`token` 과 `storeId` 를 **둘 다** 넘긴다 — SDK 는 OIDC 가 있으면 `BLOB_STORE_ID` 를 보고
저장소를 정하는 길도 갖고 있어서, 토큰만 넘기면 환경에 따라 다른 저장소로 갈 수 있다.
`tests/unit/storage-blob-store-split.test.ts` 8건이 **이력서가 공개 저장소로 가지 않는 것**을
고정한다(설정이 없으면 공개 쪽으로 떨어지지 않고 멈추는 것까지).

### 2-7. 운영에서 예상 못 한 오류의 **이름만** 기록돼 원인을 알 수 없었다

```
server_action_error { name: 'Error' }
```

2-4·2-6 을 좁히는 데 이 한 줄이 전부였다. 값이 섞이지 않는 범위에서 **우리 코드가 던진
상수 코드**(대문자·숫자·밑줄)만 통과시켜 함께 남기도록 고쳤다. 외부 라이브러리 메시지는
입력값이 섞일 수 있어 그대로 남기지 않는다(`CLAUDE.md` 4장).

---

## 3. 최종 상태에서 확인한 것

마지막 배포 `munsayu-v2-nextjs-dww94izwh` (production 별칭 `munsayu-v2-nextjs.vercel.app`).

### 3-1. 스테이징 점검 — **32건 통과 / 1건 건너뜀**

```
$ STAGING_BASE_URL=https://munsayu-v2-nextjs.vercel.app \
  VERCEL_AUTOMATION_BYPASS_SECRET=<열쇠> npm run e2e:staging
  1 skipped          ← 사진 올리기 점검(환경 변수를 줄 때만 돈다)
  32 passed (10.8s)
```

공개 화면 16개 200 · 운영 보안 헤더 · robots·sitemap · 308 표본 5 · 410 표본 4 ·
관리자 경로 401 3 · 관리자 로그인 화면 200 · 파기 예약 404.

### 3-2. 파기 예약 — **막힌 쪽과 통과하는 쪽 둘 다**

```
비밀값 없이:  404
틀린 값:      404
올바른 값:    200  {"skipped":true,"reason":"automatic-purge-disabled"}
```

`EV-0016` 에 적어 둔 한계(「404 는 경로 미배포·비밀값 공백에도 통과한다」)가 **해소됐다.**
올바른 값으로 200 이 오고, 「자동 파기 사용」이 꺼져 있어 **아무것도 지우지 않았다**
(ASM-100 의 스위치가 실제 호스트에서 동작). 지운 건수는 0 이다.

### 3-3. 사진 올리기 — Blob 저장소에 실제로 올라가고 공개로 보인다

```
[upload] 응답 문구: 사진을 올렸습니다. (1200×800)
[upload] 콘솔 오류: []
[upload] 보관함 첫 사진 src: /_next/image?url=https%3A%2F%2Fr7tsbuj34vtfch9n.public.blob.vercel-storage.com%2Fpublic%2Fmedia%2F90a4fa0f-….png&w=256&q=75
```

| 확인 | 결과 |
|---|---|
| 공개 주소를 **열쇠 없이** 받기 | `200` · `image/png` · 4,008 bytes |
| `next/image` 최적화 경로 | `200` · `image/png` · 381 bytes (`remotePatterns` 가 Blob 호스트를 허용) |
| **비공개** 저장소 호스트로 같은 경로 | `403` — 공개로 열리지 않는다 |
| 검사 전 원본(staging 영역) | 브라우저가 private 저장소로 직접 PUT → 서버가 다시 읽어 변환 → 지움. 이 경로가 실제로 동작했다 |

즉 **서명된 PUT 주소 방식**(ADR-009 결정 2-1 의 「방법 대체」)이 실제 저장소를 상대로
동작하는 것이 확인됐다. 바이트는 서버 함수를 지나가지 않는다.

### 3-4. 되돌리기 연습 (Gate 4) — 실제로 한 번 실행

| 단계 | 명령 | 걸린 시간 |
|---|---|---|
| 앞 버전으로 | `vercel rollback munsayu-v2-nextjs-iu5jdku5z-…` → `dpl_33GeZVfCmJkMFTzPNGS2gnBkYXKU` (Phase 6, `main` `ee46bf6`) | 명령 **4초**, 별칭이 바뀌기까지 **8초** |
| 앞으로 | `vercel promote munsayu-v2-nextjs-d7jjfcczb-…` | **14초** |

되돌린 상태에서 확인한 것 — **앞 버전 코드가 새 스키마에서 그대로 돈다**
(`rollback-plan.md` 3-1 의 주의가 맞는지 실제로 본 것):

```
/                 200     /notice            200   (가져온 공지 2건 보임)
/sub/Presentation 200     /sub/Check         200
/admin/login      200     /bbs/board.php…    308
/uAdmin           410     /api/cron/privacy-purge  404  ← Phase 6 에는 없는 경로
```

→ 소요 시간 추정 「1~3분」은 실제보다 보수적이다. 실제는 **10초대**였다.

### 3-5. 로그인 보호

스테이징 production 별칭이 **로그인 보호 없이 공개**로 열려 있었다(`/admin/login` 200).
시드가 넣는 `admin`·`member01` 의 비밀번호는 저장소의 테스트 고정값이라, 누구나
관리자로 들어올 수 있는 상태였다. 사용자 결정에 따라 `ssoProtection` 을
`deploymentType: "all"` 로 올렸다.

```
익명:            302 (Vercel 로그인으로)
보호 우회 열쇠:  200
```

---

## 4. 이 기록으로 증명되지 않는 것

- **운영 DB 에서 표를 처음 만드는 장면**은 보지 못했다. 운영 DB 는 전환 당일 새로
  만든다(D10 · ADR-009). 스테이징에서는 사람이 먼저 적용해 둔 뒤 배포했다.
- **Vercel Cron 이 스스로 부르는 것**은 보지 못했다. 손으로 같은 모양의 요청을 보내
  인증과 스위치를 확인했을 뿐이다. 하루 한 번 18:00 UTC 실행 기록은 전환 후
  Vercel → Crons 에서 본다.
- **파기가 실제로 지우는 경로**는 보지 못했다. 「자동 파기 사용」이 꺼져 있어 건너뛰었다.
  켠 상태로 돌려 보는 것은 지우는 일이라 스테이징에서도 사람 판단으로 남긴다.
- **사람이 눌러 보는 점검**(신청 각 1건·상태 변경·CSV·공지 작성·휴대폰 화면)은 하지
  않았다. `migration-checklist.md` 3-2·3-3 의 사람 몫이다.
- **이력서 업로드(AD-011)** 는 실제로 올려 보지 않았다. 같은 private 저장소·같은 티켓
  경로를 쓰는 검사 전 원본이 동작한 것이 간접 근거이고, 저장소 분리는 단위 테스트
  8건이 고정한다.
- 메일(비밀번호 재설정)은 보내 보지 않았다. `MAIL_ADAPTER` 값을 확인하지 않았고
  업체 결정(D4)이 아직 없다.
- 스테이징 보관함에 **올리기 점검으로 만든 단색 사진 2장**이 남아 있다. 전환과 무관하다.

# EV-0016 — Phase 7 스테이징 점검 묶음 실행 기록

> 등급 `OBSERVED` · 2026-11-15 · 기록자 Claude Code
> **스테이징 호스트가 아니라 `로컬 운영 빌드`** 를 상대로 돌린 것이다. 이 차이가 중요하다 —
> Gate 1번(스테이징 전체 E2E)은 이 기록으로 충족되지 않는다.

## 무엇을 어떻게 돌렸는가

```bash
npx next build                       # 운영 빌드 (NODE_ENV=production)
npx next start -H 127.0.0.1 -p 3100  # 운영 서버
STAGING_BASE_URL=http://127.0.0.1:3100 npm run e2e:staging
```

- 보호 우회 열쇠(`VERCEL_AUTOMATION_BYPASS_SECRET`)는 쓰지 않았다. 로컬에는 로그인 보호가 없다.
- DB 는 로컬 PostgreSQL(포트 55433), 시드가 들어간 상태.
- 운영 사이트(munsayu.com)에는 **접속하지 않았다.** 모든 요청이 127.0.0.1 로 갔다.

## 결과 — 32건 전부 통과

```

Running 32 tests using 1 worker

  ✓   1 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › / 가 200 으로 열린다 (22ms)
  ✓   2 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /sub/about 가 200 으로 열린다 (18ms)
  ✓   3 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /sub/Location 가 200 으로 열린다 (11ms)
  ✓   4 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /sub/Facility 가 200 으로 열린다 (13ms)
  ✓   5 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /sub/abouttch1 가 200 으로 열린다 (15ms)
  ✓   6 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /sub/abouttch2 가 200 으로 열린다 (12ms)
  ✓   7 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /sub/abouttch3 가 200 으로 열린다 (12ms)
  ✓   8 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /sub/schedule.n 가 200 으로 열린다 (14ms)
  ✓   9 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /sub/schedule.g 가 200 으로 열린다 (10ms)
  ✓  10 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /sub/Presentation 가 200 으로 열린다 (14ms)
  ✓  11 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /sub/Check 가 200 으로 열린다 (11ms)
  ✓  12 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /notice 가 200 으로 열린다 (22ms)
  ✓  13 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /login 가 200 으로 열린다 (9ms)
  ✓  14 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /register 가 200 으로 열린다 (8ms)
  ✓  15 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /account/recovery 가 200 으로 열린다 (8ms)
  ✓  16 [staging] › tests/staging/smoke.spec.ts:50:5 › 스테이징 공개 화면 › /account/password-reset 가 200 으로 열린다 (11ms)
  ✓  17 [staging] › tests/staging/smoke.spec.ts:63:3 › 스테이징 공개 화면 › 홈 화면에 보안 헤더가 붙는다 (10ms)
  ✓  18 [staging] › tests/staging/smoke.spec.ts:87:3 › 스테이징 공개 화면 › robots.txt 와 sitemap.xml 이 열리고 sitemap 줄이 있다 (11ms)
  ✓  19 [staging] › tests/staging/smoke.spec.ts:111:5 › 스테이징 레거시 주소 (RT-001~004) › /bbs/board.php?bo_table=notice → 308 /notice (2ms)
  ✓  20 [staging] › tests/staging/smoke.spec.ts:111:5 › 스테이징 레거시 주소 (RT-001~004) › /bbs/board.php?bo_table=notice&wr_id=1 → 308 /notice/1 (1ms)
  ✓  21 [staging] › tests/staging/smoke.spec.ts:111:5 › 스테이징 레거시 주소 (RT-001~004) › /bbs/login.php → 308 /login (4ms)
  ✓  22 [staging] › tests/staging/smoke.spec.ts:111:5 › 스테이징 레거시 주소 (RT-001~004) › /bbs/register.php → 308 /register (1ms)
  ✓  23 [staging] › tests/staging/smoke.spec.ts:111:5 › 스테이징 레거시 주소 (RT-001~004) › /bbs/password_lost.php → 308 /account/recovery (1ms)
  ✓  24 [staging] › tests/staging/smoke.spec.ts:128:5 › 스테이징 레거시 주소 (RT-001~004) › /uAdmin 는 410 이고 관리자 주소를 드러내지 않는다 (2ms)
  ✓  25 [staging] › tests/staging/smoke.spec.ts:141:5 › 스테이징 레거시 주소 (RT-001~004) › /uAdmin/ 도 따라가면 410 으로 끝난다 (2ms)
  ✓  26 [staging] › tests/staging/smoke.spec.ts:128:5 › 스테이징 레거시 주소 (RT-001~004) › /adm 는 410 이고 관리자 주소를 드러내지 않는다 (1ms)
  ✓  27 [staging] › tests/staging/smoke.spec.ts:141:5 › 스테이징 레거시 주소 (RT-001~004) › /adm/ 도 따라가면 410 으로 끝난다 (2ms)
  ✓  28 [staging] › tests/staging/smoke.spec.ts:150:3 › 스테이징 관리자 경로 › 관리자 로그인 화면이 열린다 (9ms)
  ✓  29 [staging] › tests/staging/smoke.spec.ts:161:5 › 스테이징 관리자 경로 › 로그인하지 않으면 /api/admin/applications 가 자료를 주지 않는다 (19ms)
  ✓  30 [staging] › tests/staging/smoke.spec.ts:161:5 › 스테이징 관리자 경로 › 로그인하지 않으면 /api/admin/consultations 가 자료를 주지 않는다 (17ms)
  ✓  31 [staging] › tests/staging/smoke.spec.ts:161:5 › 스테이징 관리자 경로 › 로그인하지 않으면 /api/admin/instructor-applications 가 자료를 주지 않는다 (3ms)
  ✓  32 [staging] › tests/staging/smoke.spec.ts:176:3 › 스테이징 관리자 경로 › 파기 예약 경로는 비밀값 없이 통과하지 못한다 (4ms)

  32 passed (591ms)
```

## 응답 헤더 (홈 `/`, 운영 빌드)

```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://www.google-analytics.com; font-src 'self'; connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests
permissions-policy: camera=(), microphone=(), geolocation=(), payment=()
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
```

읽을 점

- `strict-transport-security` 가 **있다.** 개발 모드에서는 붙지 않는다.
- CSP 에 `unsafe-eval` 이 **없다.** 개발 모드에서만 열린다(React 디버깅용).
- `img-src` 에 `https://*.public.blob.vercel-storage.com` 이 들어 있다. Blob 사진이 뜰 수 있다.
- `x-powered-by` 가 **없다.**

## 주소별 응답 코드 (RT-001~004 · ASM-100)

```
/bbs/board.php?bo_table=notice -> 308 http://127.0.0.1:3100/notice
/bbs/login.php -> 308 http://127.0.0.1:3100/login
/uAdmin -> 410 
/adm -> 410 
/uAdmin/ -> 308 http://127.0.0.1:3100/uAdmin
/api/cron/privacy-purge -> 404 
```

읽을 점

- `/uAdmin`·`/adm` 은 **410**, 응답 본문에 `/admin` 이 나오지 않는다.
- 끝에 `/` 가 붙은 `/uAdmin/` 은 Next 가 끝의 `/` 를 떼는 **308 을 한 번 거친 뒤** 410 이다.
  레거시 robots.txt 에 적혀 있던 모양이 이것이다(EV-0002). 처음에는 체크리스트에 410 이라고만
  적었는데, 이 점검을 실제로 돌려 서술이 틀린 것을 찾아 고쳤다.
- `/api/cron/privacy-purge` 는 비밀값 없이 부르면 **404**. 경로의 존재를 드러내지 않는다 (ASM-100).

## 이 기록으로 증명되지 않는 것

- 스테이징·운영 **호스트**에서의 동작. 위는 로컬 운영 빌드다.
- Vercel 로그인 보호를 지나가는 헤더가 실제로 먹는지.
- Vercel Blob 저장소에 사진이 올라가는지. 관리자 로그인이 필요해 아직 한 번도 못 돌렸다.
- 파기 예약이 **성공하는** 경로. 404 단정은 경로가 배포되지 않았거나 `CRON_SECRET` 이
  비어 있어도 통과하므로, 통과한다고 인증이 동작한다는 뜻은 아니다. 성공 경로는 비밀값을
  아는 사람만 확인할 수 있어 Vercel → Crons 실행 기록으로 확인한다
  (`docs/migration-checklist.md` 4장). 비밀값 비교 자체는 `tests/unit/cron-auth.test.ts` 6건이 고정한다.

import { NextResponse, type NextRequest } from "next/server";

/**
 * RT-001 / RT-002 / RT-004 레거시 URL 호환.
 *
 * 규칙의 원본은 `docs/contracts/route-compatibility-map.json` 하나다. 이 파일은 그 규칙만 그대로 옮긴다.
 * - `/bbs/board.php?bo_table=notice` → 308 `/notice`
 * - `/bbs/board.php?bo_table=notice&wr_id={id}` → 308 `/notice/{id}`
 * - `/bbs/login.php` → 308 `/login`
 * - `/bbs/register.php` → 308 `/register`
 * - `/bbs/password_lost.php` → 308 `/account/recovery`
 * - `/uAdmin/**`, `/adm/**` → 410 Gone. 응답에 `/admin` 이 있다는 사실을 드러내지 않는다. (RT-004, EV-0002)
 *
 * 같은 규칙을 Route Handler 로 중복 구현하지 않는다. 처리는 여기 한 곳에서만 한다.
 *
 * Phase 6 에서 **보안 헤더**도 여기서 붙인다. CSP 는 요청마다 다른 nonce 를 쓰므로
 * 정적 설정(`next.config.ts`)에 둘 수 없다. 그래서 matcher 를 모든 경로로 넓혔다.
 * 레거시 주소 처리는 아래에서 **먼저** 끝내므로 RT-001/002/004 동작은 그대로다.
 *
 * Next.js 16 은 `middleware` 파일 규칙을 deprecated 로 보고 `proxy` 를 쓰라고 안내한다.
 * 파일은 default export 또는 `proxy` 라는 이름의 함수를 내보내야 한다
 * (node_modules/next/dist/build/analysis/get-page-static-info.js 의
 *  `validateMiddlewareProxyExports` 확인). `config.matcher` 는 그대로 쓸 수 있고
 * `runtime` 같은 세그먼트 설정만 금지된다 — proxy 는 항상 Node.js 런타임이다.
 */

const GONE_BODY = "요청하신 주소는 더 이상 제공되지 않습니다.";

/** `/bbs/<파일>.php` 를 새 경로로 바꾸는 단순 대응표. */
const BBS_PATH_REDIRECTS: Record<string, string> = {
  "/bbs/login.php": "/login",
  "/bbs/register.php": "/register",
  "/bbs/password_lost.php": "/account/recovery",
};

function permanentRedirectTo(request: NextRequest, pathname: string): NextResponse {
  const target = new URL(pathname, request.nextUrl.origin);
  // 리다이렉트·410 응답에도 보안 헤더를 붙인다. 「모든 응답」이라는 말을 지킨다.
  return withSecurityHeaders(NextResponse.redirect(target, 308));
}

function gone(): NextResponse {
  return new NextResponse(GONE_BODY, {
    status: 410,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-robots-tag": "noindex",
      "cache-control": "no-store",
    },
  });
}

/**
 * 모든 응답에 붙이는 보안 헤더.
 *
 * - `Content-Security-Policy` — **nonce 를 쓰지 않는다.**
 *
 *   처음에는 요청마다 nonce 를 만들어 `strict-dynamic` 과 함께 썼다. 그런데 이 앱은
 *   `cacheComponents` 로 화면을 **미리 만들어 둔다.** 미리 만든 HTML 에는 요청마다
 *   달라지는 nonce 를 넣을 수 없다. 게다가 `strict-dynamic` 이 있으면 CSP3 브라우저는
 *   `'self'` 를 **무시**하므로, nonce 가 없는 그 스크립트들이 전부 막힌다.
 *   운영 빌드에서 직접 확인했더니 화면당 11~13건씩 **모두 62건이 막혔다.**
 *   미리 만들기를 끄면 LCP 개선(2.9초 → 0.6초)이 날아간다. 그래서 nonce 를 버렸다.
 *
 *   지금 정책은 `script-src 'self' 'unsafe-inline'` 이다. 바깥 주소에서 스크립트를
 *   불러오는 일(가장 흔한 주입 경로)은 여전히 막고, `object-src 'none'`·`base-uri`·
 *   `form-action`·`frame-ancestors` 도 그대로 막는다. 다만 **본문에 끼워 넣은 스크립트는
 *   막지 못한다.** 그 자리는 공지 본문 정리기(ADR-006, 저장·읽기·가져오기 세 곳)가 맡는다.
 *   더 조이려면 미리 만들기를 포기해야 하므로, 운영에서 `Report-Only` 로 지켜본 뒤
 *   결정하는 것을 Phase 7 로 넘긴다.
 *
 *   `style-src` 의 `unsafe-inline` 은 Tailwind·React 의 style 속성 때문이다. 스타일은
 *   코드 실행이 아니라 위험도가 낮다.
 *   `googletagmanager` 는 AD-012 분석 스크립트 자리다. `ANALYTICS_PROVIDER_ID` 가 비어
 *   있으면 스크립트 자체가 나가지 않는다.
 * - `frame-ancestors 'none'` — 다른 사이트가 우리 화면을 끼워 넣지 못하게 한다(클릭 가로채기).
 * - `Strict-Transport-Security` — https 로만 오게 한다. 로컬 http 개발을 막지 않도록
 *   운영에서만 붙인다.
 */
function securityHeaders(): Record<string, string> {
  const isProduction = process.env.NODE_ENV === "production";

  /*
   * **Blob 저장소를 쓰면 업로드가 `connect-src` 를 지난다.** (AD-015, ADR-008)
   *
   * 사진 바이트는 서버 함수를 거치지 않고 브라우저가 서명된 주소로 직접 PUT 한다.
   * `@vercel/blob` 의 서명 주소는 `https://vercel.com/api/blob/...` 이라서, Phase 6 에서
   * 넣은 `connect-src 'self' …` 가 그 요청을 **막는다.** 스테이징에서 실제로 막혔다 —
   * 「사진을 올리지 못했습니다」와 CSP 위반 콘솔 오류 (OBSERVED 2026-11-15, EV-0019).
   * `img-src` 만 Blob 호스트를 열어 둔 것으로는 **보기만 되고 올리기가 안 된다.**
   *
   * 로컬 파일 저장소에서는 열지 않는다. 어댑터가 `vercel-blob` 일 때만 더한다.
   */
  const blobUploadOrigins =
    process.env.STORAGE_ADAPTER?.trim() === "vercel-blob"
      ? " https://vercel.com https://*.public.blob.vercel-storage.com"
      : "";

  const csp = [
    "default-src 'self'",
    // 개발 모드의 React 는 호출 스택 복원 같은 디버깅에 `eval` 을 쓴다. 운영 빌드는 쓰지
    // 않으므로 개발에서만 열어 둔다. 운영 CSP 에는 `unsafe-eval` 이 들어가지 않는다.
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${
      isProduction ? "" : " 'unsafe-eval'"
    }`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://www.google-analytics.com",
    "font-src 'self'",
    `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com${blobUploadOrigins}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  return {
    "content-security-policy": csp,
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-frame-options": "DENY",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    ...(isProduction
      ? { "strict-transport-security": "max-age=63072000; includeSubDomains; preload" }
      : {}),
  };
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/uAdmin" || pathname.startsWith("/uAdmin/")) {
    return withSecurityHeaders(gone());
  }

  if (pathname === "/adm" || pathname.startsWith("/adm/")) {
    return withSecurityHeaders(gone());
  }

  const mappedPath = BBS_PATH_REDIRECTS[pathname];
  if (mappedPath) {
    return permanentRedirectTo(request, mappedPath);
  }

  if (pathname === "/bbs/board.php" && searchParams.get("bo_table") === "notice") {
    const writeId = searchParams.get("wr_id");

    if (writeId && /^[0-9]+$/.test(writeId)) {
      return permanentRedirectTo(request, `/notice/${writeId}`);
    }

    return permanentRedirectTo(request, "/notice");
  }

  // 그 밖의 `/bbs/**` 주소는 매핑 대상이 아니므로 그대로 두고 404 가 되게 한다. // ASM-057
  // 레거시 주소가 아닌 보통 요청도 여기로 와서 보안 헤더를 받는다.
  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  /*
   * 보안 헤더를 모든 화면에 붙이려고 전 경로를 받는다.
   * 정적 파일과 이미지 최적화 경로는 뺀다 — 헤더가 필요 없고 요청 수가 많다.
   */
  matcher: [
    /*
     * `uploads/` 는 **일부러 뺐다가 다시 넣었다.** 사용자가 올린 파일이 나가는 자리라
     * `nosniff` 가 가장 필요하다. 빠뜨리면 브라우저가 내용으로 형식을 추측한다.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|images/).*)",
  ],
};

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
  return NextResponse.redirect(target, 308);
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
 * - `Content-Security-Policy` — 요청마다 만든 nonce 를 쓴다. Next 는 요청 헤더의 CSP 에서
 *   nonce 를 읽어 자기가 넣는 스크립트에 붙인다. `strict-dynamic` 이 있어야 그 스크립트가
 *   불러오는 청크까지 허용된다.
 *   `style-src` 에 `unsafe-inline` 을 남긴 이유: Tailwind 와 React 가 style 속성을 쓴다.
 *   스타일은 스크립트와 달리 코드 실행이 아니라 위험도가 낮다.
 *   `googletagmanager` 는 AD-012 분석 스크립트 자리다. `ANALYTICS_PROVIDER_ID` 가 비어
 *   있으면 스크립트 자체가 나가지 않는다.
 * - `frame-ancestors 'none'` — 다른 사이트가 우리 화면을 끼워 넣지 못하게 한다(클릭 가로채기).
 * - `Strict-Transport-Security` — https 로만 오게 한다. 로컬 http 개발을 막지 않도록
 *   운영에서만 붙인다.
 */
function securityHeaders(nonce: string): Record<string, string> {
  const isProduction = process.env.NODE_ENV === "production";

  const csp = [
    "default-src 'self'",
    // 개발 모드의 React 는 호출 스택 복원 같은 디버깅에 `eval` 을 쓴다. 운영 빌드는 쓰지
    // 않으므로 개발에서만 열어 둔다. 운영 CSP 에는 `unsafe-eval` 이 들어가지 않는다.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com${
      isProduction ? "" : " 'unsafe-eval'"
    }`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://www.google-analytics.com",
    "font-src 'self'",
    "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
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

function withSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders(nonce))) {
    response.headers.set(key, value);
  }
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/uAdmin" || pathname.startsWith("/uAdmin/")) {
    return gone();
  }

  if (pathname === "/adm" || pathname.startsWith("/adm/")) {
    return gone();
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
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next 가 자기 스크립트에 nonce 를 붙이려면 **요청 헤더**의 CSP 를 본다.
  requestHeaders.set("content-security-policy", securityHeaders(nonce)["content-security-policy"]);

  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
  );
}

export const config = {
  /*
   * 보안 헤더를 모든 화면에 붙이려고 전 경로를 받는다.
   * 정적 파일과 이미지 최적화 경로는 뺀다 — 헤더가 필요 없고 요청 수가 많다.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|images/|uploads/).*)",
  ],
};

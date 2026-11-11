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
  return NextResponse.next();
}

export const config = {
  matcher: ["/bbs/:path*", "/uAdmin", "/uAdmin/:path*", "/adm", "/adm/:path*"],
};

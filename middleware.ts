import { NextResponse, type NextRequest } from "next/server";

/**
 * RT-001 / RT-002 레거시 URL 호환.
 *
 * 규칙의 원본은 `docs/contracts/route-compatibility-map.json` 하나다. 이 파일은 그 규칙만 그대로 옮긴다.
 * - `/bbs/board.php?bo_table=notice` → 308 `/notice`
 * - `/bbs/board.php?bo_table=notice&wr_id={id}` → 308 `/notice/{id}`
 * - `/bbs/login.php` → 308 `/login`
 * - `/bbs/register.php` → 308 `/register`
 * - `/bbs/password_lost.php` → 308 `/account/recovery`
 * - `/uAdmin/**`, `/adm/**` → 410 Gone. 응답에 `/admin` 이 있다는 사실을 드러내지 않는다. (EV-0002)
 *
 * 같은 규칙을 Route Handler 로 중복 구현하지 않는다. 처리는 여기 한 곳에서만 한다.
 * (Next.js 16 은 `middleware.ts` 와 `proxy.ts` 를 모두 인식한다 —
 *  node_modules/next/dist/lib/constants.js 의 MIDDLEWARE_FILENAME/PROXY_FILENAME 확인)
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

export function middleware(request: NextRequest): NextResponse {
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

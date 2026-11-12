import "server-only";
import type { SessionScope } from "@prisma/client";

/**
 * 회원 세션과 관리자 세션을 다른 쿠키 이름으로 완전히 분리한다.
 * 회원 쿠키로는 관리자 요청을 통과시킬 수 없다. (BLUEPRINT 7장)
 */
export const SESSION_COOKIE_NAMES: Record<SessionScope, string> = {
  MEMBER: "munsayu_member_session",
  ADMIN: "munsayu_admin_session",
};

export const REMEMBER_ME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** 로그인 유지를 끄면 브라우저 세션 동안만 유효한 쿠키를 쓰고 서버 만료는 1일로 둔다. */
export const SESSION_ONLY_LIFETIME_SECONDS = 24 * 60 * 60;

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

function cookieAttributes(maxAgeSeconds: number | null): string {
  const attributes = ["Path=/", "HttpOnly", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }
  if (maxAgeSeconds !== null) {
    attributes.push(`Max-Age=${maxAgeSeconds}`);
  }
  return attributes.join("; ");
}

export function sessionCookieHeader(
  scope: SessionScope,
  token: string,
  maxAgeSeconds: number | null,
): string {
  const name = SESSION_COOKIE_NAMES[scope];
  return `${name}=${encodeURIComponent(token)}; ${cookieAttributes(maxAgeSeconds)}`;
}

export function clearSessionCookieHeader(scope: SessionScope): string {
  const name = SESSION_COOKIE_NAMES[scope];
  return `${name}=; ${cookieAttributes(0)}`;
}

/** 응답에 Set-Cookie를 덧붙인다. 여러 쿠키를 한 응답에 넣을 수 있게 append를 쓴다. */
export function withCookies(response: Response, cookies: string[]): Response {
  const headers = new Headers(response.headers);
  for (const cookie of cookies) {
    headers.append("Set-Cookie", cookie);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

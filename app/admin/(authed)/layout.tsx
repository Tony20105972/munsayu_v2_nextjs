import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/account/logout-button";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminUserFromCookies } from "@/server/auth/server-component-session";

/**
 * 관리자 화면 레이아웃 겸 접근 가드 (AD-001).
 *
 * - 관리자 세션을 **요청마다 서버에서** 다시 확인한다. 쿠키 → 세션 행 → 계정 상태 →
 *   역할까지 다시 본다(`getAdminUserFromCookies`). 화면에서 버튼을 숨기는 것은
 *   권한 처리가 아니다. (BLUEPRINT 7장)
 * - 회원 세션 쿠키로는 절대 통과하지 않는다. 쿠키 이름이 다르고 범위도 다르다.
 * - 레이아웃 가드만 믿지 않는다. 관리자 Server Action 은 각자 다시 권한을 확인한다.
 * - 로그인 화면(`/admin/login`)은 이 그룹 바깥에 있어 가드에 걸리지 않는다.
 */
export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

/** 세션을 보고 비로그인은 바로 돌려보내야 하므로 미리 렌더하지 않는다. */
export const instant = false;

export default async function AdminAuthedLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminUserFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        본문으로 건너뛰기
      </a>

      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-bold">문해와 사유 관리자</p>
            <p className="text-xs text-white/70">
              로그인: {admin.name} ({admin.loginId})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md border border-white/30 px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
            >
              홈페이지 보기
            </Link>
            <LogoutButton redirectTo="/admin/login" />
          </div>
        </div>
      </header>

      <AdminNav />

      <main id="admin-content" className="flex-1">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">{children}</div>
      </main>

      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs leading-relaxed text-muted">
          신청자 개인정보 조회와 CSV 내보내기, 파기 실행은 모두 누가 언제 했는지 기록에
          남습니다. 업무에 필요한 범위에서만 사용해 주세요. (AD-013)
        </p>
      </footer>
    </div>
  );
}

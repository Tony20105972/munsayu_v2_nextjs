import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAdminUserFromCookies } from "@/server/auth/server-component-session";

/**
 * AD-001 관리자 로그인 화면.
 *
 * 가드가 걸린 `app/admin/(authed)/**` 바깥에 둔다. 가드 안에 두면 로그인 화면에서
 * 다시 로그인 화면으로 보내는 고리가 생긴다.
 * 관리자 화면은 검색 노출 대상이 아니므로 `robots` 를 막는다.
 */
export const metadata: Metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdminLoginPage() {
  // 이미 관리자 세션이 있으면 바로 관리자 화면으로 보낸다.
  const admin = await getAdminUserFromCookies();
  if (admin) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6">
        <h1 className="text-lg font-bold text-ink">문해와 사유 관리자</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          학원 업무 화면입니다. 관리자 계정으로만 들어올 수 있습니다. 회원 계정으로는
          들어올 수 없습니다.
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}

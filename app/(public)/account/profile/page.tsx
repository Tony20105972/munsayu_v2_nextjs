import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/account/logout-button";
import {
  ChangePasswordForm,
  UpdateProfileForm,
} from "@/components/account/profile-forms";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";
import { getMemberUserFromCookies } from "@/server/auth/server-component-session";

/**
 * 로그인 상태를 요청마다 서버에서 확인해 비로그인은 바로 로그인 화면으로 보내야 하므로
 * 이 경로는 미리 렌더하지 않고 요청 시점에 막고 그린다. (Next.js 16 `instant`)
 */
export const instant = false;

/**
 * FM-003 회원 정보 수정.
 * 로그인 여부는 요청마다 서버에서 다시 확인한다. 화면에서 숨기는 것은 권한 처리가 아니다.
 * (BLUEPRINT 7장)
 */
export const metadata = buildPageMetadata({
  title: pageTitle("회원 정보 수정"),
  description: "회원 정보를 수정하고 비밀번호를 바꿀 수 있습니다.",
  path: "/account/profile",
});

export default async function AccountProfilePage() {
  const member = await getMemberUserFromCookies();
  if (!member) {
    redirect("/login");
  }

  return (
    <>
      <PageBanner
        title="회원 정보 수정"
        description="회원 정보를 수정하고 비밀번호를 바꿀 수 있습니다."
      />
      <section className="bg-canvas">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">
              로그인 계정:{" "}
              <strong className="font-bold text-ink">{member.loginId}</strong>
            </p>
            <LogoutButton redirectTo="/" />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <UpdateProfileForm defaultName={member.name} />
            <ChangePasswordForm />
          </div>

          <p className="mt-8">
            <Link
              href="/account/withdraw"
              className="text-sm font-bold text-muted hover:text-brand hover:underline"
            >
              회원 탈퇴
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

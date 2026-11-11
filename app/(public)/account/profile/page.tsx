import Link from "next/link";
import {
  ChangePasswordForm,
  UpdateProfileForm,
} from "@/components/account/profile-forms";
import { PageBanner } from "@/components/ui/page-banner";
import { getSessionUserStub } from "@/lib/data/stubs";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * FM-003 회원 정보 수정.
 * 로그인 여부 확인은 서버에서 해야 하므로 통합 때 세션 조회로 바뀐다. (BLUEPRINT 7장)
 */
export const metadata = buildPageMetadata({
  title: pageTitle("회원 정보 수정"),
  description: "회원 정보를 수정하고 비밀번호를 바꿀 수 있습니다.",
  path: "/account/profile",
});

export default function AccountProfilePage() {
  const sessionUser = getSessionUserStub();

  return (
    <>
      <PageBanner
        title="회원 정보 수정"
        description="회원 정보를 수정하고 비밀번호를 바꿀 수 있습니다."
      />
      <section className="bg-canvas">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <p className="text-sm text-muted">
            로그인 계정:{" "}
            <strong className="font-bold text-ink">{sessionUser.loginId}</strong>
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <UpdateProfileForm defaultName={sessionUser.name} />
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

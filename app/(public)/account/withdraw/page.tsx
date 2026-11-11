import { redirect } from "next/navigation";
import { WithdrawForm } from "@/components/account/withdraw-form";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";
import { getMemberUserFromCookies } from "@/server/auth/server-component-session";

/**
 * 로그인 상태를 요청마다 서버에서 확인해 비로그인은 바로 로그인 화면으로 보내야 하므로
 * 이 경로는 미리 렌더하지 않고 요청 시점에 막고 그린다. (Next.js 16 `instant`)
 */
export const instant = false;

/** FM-003 회원 탈퇴. 로그인 여부를 요청마다 서버에서 확인한다. (BLUEPRINT 7장) */
export const metadata = buildPageMetadata({
  title: pageTitle("회원 탈퇴"),
  description: "문해와 사유 회원 탈퇴 화면입니다.",
  path: "/account/withdraw",
});

export default async function AccountWithdrawPage() {
  const member = await getMemberUserFromCookies();
  if (!member) {
    redirect("/login");
  }

  return (
    <>
      <PageBanner
        title="회원 탈퇴"
        description="탈퇴 전에 아래 안내를 확인해 주세요."
      />
      <section className="bg-canvas">
        <div className="mx-auto max-w-md px-4 py-12">
          <WithdrawForm />
        </div>
      </section>
    </>
  );
}

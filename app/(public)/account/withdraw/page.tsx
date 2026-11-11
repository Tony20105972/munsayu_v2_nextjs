import { WithdrawForm } from "@/components/account/withdraw-form";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/** FM-003 회원 탈퇴. */
export const metadata = buildPageMetadata({
  title: pageTitle("회원 탈퇴"),
  description: "문해와 사유 회원 탈퇴 화면입니다.",
  path: "/account/withdraw",
});

export default function AccountWithdrawPage() {
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

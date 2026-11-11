import {
  FindLoginIdForm,
  RequestPasswordResetForm,
} from "@/components/account/recovery-forms";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * FM-003 아이디·비밀번호 찾기.
 * 레거시 `/bbs/password_lost.php` 를 이 경로로 308 한다. (RT-002)
 */
export const metadata = buildPageMetadata({
  title: pageTitle("아이디·비밀번호 찾기"),
  description: "가입 정보로 아이디를 찾고 비밀번호 재설정 링크를 받을 수 있습니다.",
  path: "/account/recovery",
});

export default function AccountRecoveryPage() {
  return (
    <>
      <PageBanner
        title="아이디·비밀번호 찾기"
        description="가입할 때 입력한 정보로 아이디를 찾거나 비밀번호를 다시 설정할 수 있습니다."
      />
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-4xl gap-6 px-4 py-12 md:grid-cols-2">
          <FindLoginIdForm />
          <RequestPasswordResetForm />
        </div>
      </section>
    </>
  );
}

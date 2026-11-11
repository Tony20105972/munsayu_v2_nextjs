import { LoginForm } from "@/components/account/login-form";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_TITLE_SUFFIX } from "@/lib/site-config";

/**
 * PG-013 로그인. 레거시 `/bbs/login.php` 를 이 경로로 308 한다. (RT-002)
 * 관찰된 title 은 `로그인 | ...` 이다. (legacy-seo-map.md)
 */
export const metadata = buildPageMetadata({
  title: `로그인 | ${SITE_TITLE_SUFFIX}`,
  description: "문해와 사유 회원 로그인 화면입니다.",
  path: "/login",
});

export default function LoginPage() {
  return (
    <>
      <PageBanner title="로그인" description="문해와 사유 회원 로그인 화면입니다." />
      <section className="bg-canvas">
        <div className="mx-auto max-w-md px-4 py-12">
          <LoginForm />
        </div>
      </section>
    </>
  );
}

import { RegisterFlow } from "@/components/account/register-flow";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_TITLE_SUFFIX } from "@/lib/site-config";

/**
 * PG-014 회원가입. 레거시 `/bbs/register.php` 를 이 경로로 308 한다. (RT-002)
 * 관찰된 title 은 `회원가입약관 | ...` 이다. (legacy-seo-map.md)
 */
export const metadata = buildPageMetadata({
  title: `회원가입약관 | ${SITE_TITLE_SUFFIX}`,
  description:
    "문사유 아카데미의 교육 서비스 이용을 위해 약관에 동의하고 회원으로 가입합니다.",
  path: "/register",
});

export default function RegisterPage() {
  return (
    <>
      <PageBanner
        title="회원가입 약관동의"
        description="문사유 아카데미의 최고급 교육 서비스 이용을 위해 약관에 동의해 주세요."
      />
      <section className="bg-canvas">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <RegisterFlow />
        </div>
      </section>
    </>
  );
}

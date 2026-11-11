import { Suspense } from "react";
import { PasswordResetForm } from "@/components/account/password-reset-form";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * FM-003 비밀번호 재설정.
 * `useSearchParams` 를 쓰는 폼이라 Suspense 경계 안에 둔다. (Next.js 16 + cacheComponents)
 */
export const metadata = buildPageMetadata({
  title: pageTitle("비밀번호 재설정"),
  description: "메일로 받은 재설정 링크로 새 비밀번호를 설정합니다.",
  path: "/account/password-reset",
});

export default function PasswordResetPage() {
  return (
    <>
      <PageBanner
        title="비밀번호 재설정"
        description="메일로 받은 재설정 링크로 새 비밀번호를 설정합니다."
      />
      <section className="bg-canvas">
        <div className="mx-auto max-w-md px-4 py-12">
          <Suspense
            fallback={
              <p className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
                재설정 화면을 불러오는 중입니다.
              </p>
            }
          >
            <PasswordResetForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}

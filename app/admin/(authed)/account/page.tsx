import { AdminChangePasswordForm } from "@/components/admin/account-panels";
import { AdminPageHeading, AdminPanel } from "@/components/admin/ui";
import { requireAdminFromCookies } from "@/server/auth/server-component-session";

/**
 * AD-016 내 계정 — 비밀번호 바꾸기.
 *
 * 레거시 관리자 화면에 없던 항목이다. 전환 뒤에는 첫 관리자를 임시 비밀번호로 만들기
 * 때문에(`scripts/bootstrap-admin.ts`) 바꿀 자리가 반드시 있어야 한다.
 *
 * 임시 비밀번호 상태에서는 레이아웃이 이 화면 대신 변경 폼만 보여 주므로, 이 페이지는
 * 「이미 바꿀 수 있는 상태」만 다룬다. 그래서 가드에 예외를 주지 않는다.
 */
export const instant = false;

export default async function AdminAccountPage() {
  const admin = await requireAdminFromCookies();

  return (
    <>
      <AdminPageHeading
        featureId="AD-016"
        title="내 계정"
        description="비밀번호를 바꿉니다. 바꾸면 이 계정의 로그인이 모두 끊기고 다시 로그인해야 합니다."
      />

      <AdminPanel title="로그인 정보">
        <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="font-bold text-ink">아이디</dt>
          <dd className="text-ink">{admin.loginId}</dd>
          <dt className="font-bold text-ink">이름</dt>
          <dd className="text-ink">{admin.name}</dd>
        </dl>
        <p className="mt-3 text-xs text-muted">
          아이디와 이름은 이 화면에서 바꾸지 않습니다. 다른 관리자가 「회원 관리」에서
          바꿉니다.
        </p>
      </AdminPanel>

      <AdminPanel title="비밀번호 바꾸기">
        <AdminChangePasswordForm />
      </AdminPanel>
    </>
  );
}

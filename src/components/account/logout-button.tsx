"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/account";

/**
 * 로그아웃 버튼. 회원·관리자 두 범위의 세션과 쿠키를 모두 지운다.
 * 공개 헤더는 레거시 그대로 로그인·회원가입 링크만 보여 주므로(ASM-073)
 * 로그아웃은 회원 전용 화면과 관리자 화면에서 제공한다.
 */
export function LogoutButton({
  redirectTo,
  variant = "secondary",
}: {
  redirectTo: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const tone =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-dark"
      : "border border-line bg-surface text-ink hover:bg-canvas";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await logoutAction();
        router.replace(redirectTo);
        router.refresh();
      }}
      className={`rounded-md px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${tone}`}
    >
      {pending ? "처리 중…" : "로그아웃"}
    </button>
  );
}

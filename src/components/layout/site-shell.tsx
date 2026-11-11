import type { ReactNode } from "react";
import Link from "next/link";

const nav = [
  ["학원안내", "/sub/about"], ["강사진", "/sub/abouttch1"], ["시간표", "/sub/schedule.n"],
  ["설명회", "/sub/Presentation"], ["예약확인", "/sub/Check"],
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[#fffdf8] text-[#29231e]">
    <header className="border-b border-stone-200 bg-[#fffdf8]"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
      <Link href="/" className="text-xl font-bold tracking-[-.08em]">문해와 사유</Link>
      <nav aria-label="주 메뉴" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">{nav.map(([label, href]) => <Link key={href} href={href} className="hover:text-[#a65532]">{label}</Link>)}</nav>
      <div className="flex gap-3 text-xs"><Link href="/login">로그인</Link><Link href="/register">회원가입</Link></div>
    </div></header>
    <main className="flex-1">{children}</main>
    <footer className="mt-16 bg-[#29231e] px-5 py-10 text-sm text-stone-300"><div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2"><div><p className="text-lg font-bold text-white">문해와 사유</p><p className="mt-2">초등 독서논술학원 · 대치·분당</p></div><div className="md:text-right"><Link href="/sub/schedule.n">강좌 시간표</Link><span className="mx-3">·</span><Link href="/sub/Presentation">설명회</Link><span className="mx-3">·</span><a href="https://forms.gle/XUjFY9jVStQDKskg8" target="_blank" rel="noreferrer">입학진단</a></div></div></footer>
  </div>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 관리자 메뉴.
 *
 * 순서는 레거시 관리자 메뉴를 따른다 (EV-ADM-01~11, 사용자 지시 2026-11-12):
 * 회원관리 → 설명회관리 → 강사관리 → 시간표관리 → 입학진단관리 → 문자신청내역
 * → 강사지원관리 → 공지사항.
 * 「신청 목록」·「개인정보 관리」·「분석 도구」·「사이트 설정」은 레거시에 없던 항목이라 뒤에 둔다.
 */
const ADMIN_MENU = [
  { href: "/admin", label: "개요" },
  { href: "/admin/members", label: "회원 관리" },
  { href: "/admin/events", label: "설명회 관리" },
  { href: "/admin/instructors", label: "강사 관리" },
  { href: "/admin/courses", label: "시간표·강좌 관리" },
  { href: "/admin/consultations", label: "입학진단 관리" },
  { href: "/admin/sms-subscriptions", label: "문자신청내역" },
  { href: "/admin/instructor-applications", label: "강사지원관리" },
  { href: "/admin/notices", label: "공지사항" },
  { href: "/admin/applications", label: "신청 목록" },
  { href: "/admin/privacy", label: "개인정보 관리" },
  { href: "/admin/analytics", label: "분석 도구" },
  { href: "/admin/settings", label: "사이트 설정" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="관리자 메뉴" className="border-b border-line bg-surface">
      <ul className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 py-2">
        {ADMIN_MENU.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "block rounded-md bg-brand px-3 py-1.5 text-sm font-bold text-white"
                    : "block rounded-md px-3 py-1.5 text-sm font-bold text-ink hover:bg-canvas"
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** AD-015 「이미지 관리」 안에서 화면을 옮기는 탭. */
const MEDIA_TABS = [
  { href: "/admin/media", label: "이미지 보관함" },
  { href: "/admin/media/banners", label: "메인 배너" },
  { href: "/admin/media/facility", label: "시설안내 사진" },
] as const;

export function MediaTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="이미지 관리 화면" className="border-b border-line">
      <ul className="flex flex-wrap gap-1">
        {MEDIA_TABS.map((tab) => {
          const active = pathname === tab.href;

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "-mb-px block border-b-2 border-brand px-3 py-2 text-sm font-bold text-brand"
                    : "-mb-px block border-b-2 border-transparent px-3 py-2 text-sm font-bold text-muted hover:text-ink"
                }
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

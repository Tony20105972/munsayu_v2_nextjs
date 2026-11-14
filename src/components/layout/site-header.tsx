"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LOGO_IMAGE } from "@/lib/images";
import { CONSULT_CENTER_LINE, MAIN_NAV, SITE_NAME } from "@/lib/site-config";

/**
 * 레거시 공개 헤더(EV-0003) 재현.
 * - 상단 바: 상담센터 문구 + 로그인·회원가입
 * - 주 메뉴: 학원안내 · 강사진안내 · 시간표 · 설명회 · 예약확인/신청
 * 레거시 메뉴 링크는 `javascript:;` 드롭다운이라 하위 항목은 관찰된 공개 경로로 채웠다. // ASM-040
 */
export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuId = useId();

  const closeAll = useCallback(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (openMenu === null && !mobileOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAll();
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        closeAll();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [closeAll, mobileOpen, openMenu]);

  return (
    <header className="sticky top-0 z-40 bg-surface shadow-sm">
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>{CONSULT_CENTER_LINE}</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:underline">
              로그인
            </Link>
            <Link href="/register" className="hover:underline">
              회원가입
            </Link>
          </div>
        </div>
      </div>

      <nav
        ref={navRef}
        aria-label="주 메뉴"
        className="border-b border-line bg-surface"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center" onClick={closeAll}>
            {/* 레거시 헤더 로고 그대로. alt 도 레거시 원문이다. (EV-0012) */}
            <Image
              src={LOGO_IMAGE.src}
              alt={LOGO_IMAGE.alt}
              width={LOGO_IMAGE.width}
              height={LOGO_IMAGE.height}
              priority
              sizes="200px"
              className="h-10 w-auto sm:h-11"
            />
            <span className="sr-only">{SITE_NAME}</span>
          </Link>

          <button
            type="button"
            className="rounded-md border border-line px-3 py-2 text-sm font-bold text-ink lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls={mobileMenuId}
            onClick={() => {
              setMobileOpen((open) => !open);
              setOpenMenu(null);
            }}
          >
            메뉴
          </button>

          <ul className="hidden items-center gap-1 lg:flex">
            {MAIN_NAV.map((menu) => (
              <li key={menu.label} className="relative">
                <button
                  type="button"
                  className="rounded-md px-4 py-2 text-sm font-bold text-ink hover:text-brand"
                  aria-expanded={openMenu === menu.label}
                  onClick={() =>
                    setOpenMenu((current) =>
                      current === menu.label ? null : menu.label,
                    )
                  }
                >
                  {menu.label}
                  <span aria-hidden="true"> ▾</span>
                </button>
                {/*
                  펼치지 않았을 때도 **링크를 HTML 에 남긴다.** 예전에는 닫혀 있으면
                  `null` 을 돌려줘서 하위 메뉴 주소가 문서에 아예 없었다. 그래서
                  `/sub/Facility`·`/sub/abouttch2`·`/sub/Check`·`/notice` 네 화면은
                  어느 페이지에서도 연결되지 않아 검색엔진이 찾아갈 수 없었다.
                  레거시는 네 주소를 모두 HTML 에 두고 있었다. (EV-0015)
                  `hidden` 으로 감추므로 보이는 모습은 그대로다.
                */}
                <ul
                  hidden={openMenu !== menu.label}
                  className="absolute left-0 top-full z-50 min-w-48 rounded-md border border-line bg-surface py-2 shadow-lg"
                >
                  {menu.items.map((item) => (
                    <li key={`${menu.label}-${item.label}`}>
                      <Link
                        href={item.href}
                        className="block px-4 py-2 text-sm text-ink hover:bg-canvas hover:text-brand"
                        onClick={closeAll}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        {mobileOpen ? (
          <div
            id={mobileMenuId}
            className="border-t border-line bg-surface px-4 py-4 lg:hidden"
          >
            <ul className="flex flex-col gap-5">
              {MAIN_NAV.map((menu) => (
                <li key={`mobile-${menu.label}`}>
                  <p className="text-sm font-bold text-ink">{menu.label}</p>
                  <ul className="mt-2 flex flex-col gap-2 pl-3">
                    {menu.items.map((item) => (
                      <li key={`mobile-${menu.label}-${item.label}`}>
                        <Link
                          href={item.href}
                          className="block py-1 text-sm text-muted hover:text-brand"
                          onClick={closeAll}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </nav>
    </header>
  );
}

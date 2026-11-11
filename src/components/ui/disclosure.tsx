"use client";

import { useId, useState, type ReactNode } from "react";

type DisclosureProps = {
  /** 접혀 있을 때의 버튼 문구. 레거시 `상세보기` 버튼을 대신한다. // ASM-044 */
  buttonLabel: string;
  openLabel?: string;
  children: ReactNode;
};

export function Disclosure({ buttonLabel, openLabel, children }: DisclosureProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/50"
      >
        {open ? (openLabel ?? "닫기") : buttonLabel}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="mt-3 w-full rounded-md border border-line bg-canvas px-4 py-3 text-sm text-muted"
      >
        {children}
      </div>
    </>
  );
}

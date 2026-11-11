"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

type ModalDialogProps = {
  open: boolean;
  onClose: () => void;
  /** 제목 요소의 id. `aria-labelledby`로 연결한다. */
  titleId: string;
  children: ReactNode;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * 수강 예약·설명회 예약 모달의 공통 틀.
 * 열리면 안쪽으로 포커스를 가두고, Escape로 닫고, 닫으면 열기 전 요소로 포커스를 돌려준다.
 * (Phase 3 Gate 접근성 — 대화상자 키보드 이동)
 */
export function ModalDialog({ open, onClose, titleId, children }: ModalDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const focusFirstElement = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusable.item(0);
    if (first) {
      first.focus();
    } else {
      panel.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    focusFirstElement();

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [focusFirstElement, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="my-8 w-full max-w-xl rounded-xl bg-surface shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}

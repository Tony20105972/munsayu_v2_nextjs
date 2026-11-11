"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  panel: ReactNode;
};

type TabsProps = {
  items: readonly TabItem[];
  /** 탭 목록을 설명하는 이름. 화면에는 보이지 않는다. */
  label: string;
};

/**
 * 한 화면 안에서 내용을 바꾸는 탭. (학원안내·오시는 길·시설안내)
 * 좌우 방향키·Home·End로 이동할 수 있어야 한다. (Phase 3 Gate 접근성)
 */
export function Tabs({ items, label }: TabsProps) {
  const baseId = useId();
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  function focusTabAt(index: number) {
    const target = items[(index + items.length) % items.length];
    if (!target) {
      return;
    }
    setActiveId(target.id);
    tabRefs.current.get(target.id)?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTabAt(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTabAt(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTabAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTabAt(items.length - 1);
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-wrap justify-center gap-2 border-b border-line px-4"
      >
        {items.map((item, index) => {
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) {
                  tabRefs.current.set(item.id, node);
                } else {
                  tabRefs.current.delete(item.id);
                }
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={
                isActive
                  ? "-mb-px border-b-2 border-brand px-5 py-3 text-sm font-bold text-brand sm:text-base"
                  : "-mb-px border-b-2 border-transparent px-5 py-3 text-sm font-bold text-muted hover:text-ink sm:text-base"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== activeId}
          tabIndex={0}
        >
          {item.id === activeId ? item.panel : null}
        </div>
      ))}
    </div>
  );
}

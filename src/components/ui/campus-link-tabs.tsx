import Link from "next/link";
import { CAMPUSES, type Campus } from "@/lib/site-config";

type CampusLinkTabsProps = {
  activeCampusId: Campus["id"];
  label: string;
};

/**
 * 시간표처럼 지점마다 URL이 다른 화면에서 쓰는 지점 전환 메뉴.
 * 레거시도 `/sub/schedule.n` ↔ `/sub/schedule.g` 링크로 전환한다. (EV-0006, EV-0009)
 */
export function CampusLinkTabs({ activeCampusId, label }: CampusLinkTabsProps) {
  return (
    <nav aria-label={label} className="border-b border-line">
      <ul className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4">
        {CAMPUSES.map((campus) => {
          const isActive = campus.id === activeCampusId;

          return (
            <li key={campus.id}>
              <Link
                href={campus.timetablePath}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "-mb-px inline-block border-b-2 border-brand px-6 py-4 text-base font-bold text-brand"
                    : "-mb-px inline-block border-b-2 border-transparent px-6 py-4 text-base font-bold text-muted hover:text-ink"
                }
              >
                {campus.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

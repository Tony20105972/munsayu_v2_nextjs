import Link from "next/link";
import { Suspense } from "react";
import { FooterReserveLinks } from "@/components/layout/footer-reserve-links";
import {
  BUSINESS_INFO,
  CAMPUSES,
  EXTERNAL_LINKS,
  FOOTER_COLUMNS,
  FOOTER_COUNSEL_HOURS,
  FOOTER_TAGLINE_LINES,
  SITE_NAME,
} from "@/lib/site-config";

/**
 * 레거시 공개 푸터(EV-0003, EV-0007) 재현.
 * RESERVE 묶음의 `문해력 진단 신청`은 외부 Google Forms 주소를 그대로 유지한다. (RT-003)
 * 그 주소와 `강사 지원` 노출 여부는 관리자 설정값이라 `FooterReserveLinks` 로 따로 뺐다.
 */
export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="text-2xl font-bold tracking-[0.2em]">{SITE_NAME}</p>
          <p className="mt-5 text-sm leading-relaxed text-white/80">
            {FOOTER_TAGLINE_LINES.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
          <ul className="mt-6 space-y-2">
            {CAMPUSES.map((campus) => (
              <li key={campus.id} className="text-xl font-bold text-accent">
                <strong className="font-bold">{campus.name} :</strong>{" "}
                <a href={campus.telHref} className="hover:underline">
                  {campus.phone}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-white/70">{FOOTER_COUNSEL_HOURS}</p>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <h2 className="text-sm font-bold tracking-wider">{column.heading}</h2>
                <ul className="mt-4 space-y-2 text-sm text-white/75">
                  {column.links.map((link) => (
                    <li key={`${column.heading}-${link.label}`}>
                      <Link href={link.href} className="hover:text-accent">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <nav aria-label="RESERVE">
              <h2 className="text-sm font-bold tracking-wider">RESERVE</h2>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <Suspense
                  fallback={
                    <li>
                      <a
                        href={EXTERNAL_LINKS.literacyDiagnosis}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:text-accent"
                      >
                        문해력 진단 신청
                      </a>
                    </li>
                  }
                >
                  <FooterReserveLinks />
                </Suspense>
                <li>
                  <Link href="/sub/Presentation" className="hover:text-accent">
                    설명회 신청
                  </Link>
                </li>
                <li>
                  <Link href="/sub/schedule.n" className="hover:text-accent">
                    상담 문의
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="SNS">
              <h2 className="text-sm font-bold tracking-wider">SNS</h2>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>
                  <a
                    href={EXTERNAL_LINKS.instagram}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:text-accent"
                  >
                    인스타그램
                  </a>
                </li>
                <li>
                  <a
                    href={EXTERNAL_LINKS.naverBlog}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:text-accent"
                  >
                    네이버 블로그
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 border-t border-white/15 pt-6 text-xs leading-relaxed text-white/70">
            {CAMPUSES.map((campus) => (
              <p key={`address-${campus.id}`}>
                <strong className="font-bold text-white/85">{campus.name} :</strong>{" "}
                {campus.address} (TEL: {campus.phone})
              </p>
            ))}
            <p className="mt-2">{BUSINESS_INFO.representative}</p>
            <p>{BUSINESS_INFO.registration}</p>
            <p className="mt-2 text-white/55">{BUSINESS_INFO.copyright}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

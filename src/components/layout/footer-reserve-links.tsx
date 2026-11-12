import Link from "next/link";
import { connection } from "next/server";
import { getSiteSettings } from "@/server/services/settings";

/**
 * 푸터 RESERVE 묶음에서 **관리자 설정에 따라 달라지는** 항목만 모은다.
 *
 * - 「문해력 진단 신청」 주소는 관리자가 등록한 구글 폼 주소다. // ASM-082
 * - 「강사 지원」은 레거시처럼 기본으로 숨긴다. 설정을 켜야 보인다. // ASM-088
 *
 * 설정은 DB 에서 읽으므로 이 조각만 `Suspense` 안에서 기다린다. 나머지 푸터는 그대로 정적이다.
 * `cacheComponents` 환경에서는 요청 시점 렌더임을 알려야 한다. 그러지 않으면 관리자가
 * 주소를 바꿔도 미리 만들어 둔 값이 계속 나간다.
 */
export async function FooterReserveLinks() {
  await connection();
  const settings = await getSiteSettings();

  return (
    <>
      <li>
        <a
          href={settings.diagnosisCtaExternalUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="hover:text-accent"
        >
          문해력 진단 신청
        </a>
      </li>
      {settings.recruitMenuVisible ? (
        <li>
          <Link href="/sub/Recruit" className="hover:text-accent">
            강사 지원
          </Link>
        </li>
      ) : null}
    </>
  );
}

import { readAnalyticsProviderId } from "@/components/layout/analytics-script";
import { AdminPageHeading, AdminPanel } from "@/components/admin/ui";

/**
 * AD-012 분석 도구 자리.
 *
 * 자체 접속자 집계는 만들지 않는다. 레거시 집계는 프록시 IP만 남아 실제 방문자 정보가
 * 거의 없었다. (EV-ADM-06/07, Q-ADM-06 답변, ASM-004)
 * 이 화면은 **설정됐는지 여부만** 보여 준다. 분석 ID 자체는 화면에 찍지 않는다.
 */
export const instant = false;

export default function AdminAnalyticsPage() {
  const configured = readAnalyticsProviderId() !== null;

  return (
    <>
      <AdminPageHeading
        featureId="AD-012"
        title="분석 도구"
        description="방문 통계는 외부 분석 도구로 봅니다. 이 사이트는 접속자를 따로 집계하지 않습니다."
      />

      <AdminPanel title="연동 상태" headingId="analytics-status">
        <p className="text-sm text-ink">
          분석 도구 ID 환경 변수(
          <code className="font-mono">ANALYTICS_PROVIDER_ID</code>
          ):{" "}
          <strong
            data-analytics-configured={configured ? "true" : "false"}
            className={configured ? "font-bold text-brand" : "font-bold text-muted"}
          >
            {configured ? "설정됨" : "설정 안 됨"}
          </strong>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {configured
            ? "공개 화면에 분석 스크립트가 들어갑니다. 통계는 분석 업체 화면에서 봅니다."
            : "환경 변수가 비어 있어 공개 화면에 분석 스크립트를 넣지 않습니다. 외부로 나가는 요청도 생기지 않습니다."}
        </p>
        <p className="mt-2 text-xs text-muted">
          보안상 ID 값은 이 화면에 보여 주지 않습니다. 값을 바꾸려면 서버 환경 변수를
          수정하고 다시 배포해야 합니다.
        </p>
      </AdminPanel>

      <AdminPanel title="레거시 접속자집계와 다른 점" headingId="analytics-legacy">
        <ul className="space-y-1 text-sm text-muted">
          <li>
            · 레거시 접속자집계·접속자검색 화면은 옮기지 않았습니다. 기록된 IP가 모두
            사설 IP(프록시)여서 실제 방문자 정보가 남지 않았습니다.
          </li>
          <li>· 신규 사이트는 방문자 IP·접속 경로를 자체 저장하지 않습니다.</li>
          <li>
            · 분석 업체가 확정되면 스크립트 형식만 바꿉니다
            (`src/components/layout/analytics-script.tsx`).
          </li>
        </ul>
      </AdminPanel>
    </>
  );
}

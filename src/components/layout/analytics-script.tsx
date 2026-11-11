/**
 * AD-012 방문 통계 도구 연동 자리.
 *
 * 자체 접속자 집계는 만들지 않는다. 레거시 집계는 프록시 IP만 남아 쓸모가 없었다. (ASM-004)
 * `ANALYTICS_PROVIDER_ID` 환경 변수가 비어 있으면 **아무 스크립트도 넣지 않는다.**
 * 비어 있는 상태가 기본값이므로 개발·테스트에서는 외부 요청이 생기지 않는다.
 *
 * 스크립트 형식은 GA4(gtag.js)를 가정했다. 분석 업체가 확정되면 이 파일만 바꾼다. // ASM-077
 */
export function readAnalyticsProviderId(): string | null {
  const id = process.env.ANALYTICS_PROVIDER_ID?.trim();
  return id ? id : null;
}

export function AnalyticsScript() {
  const providerId = readAnalyticsProviderId();
  if (!providerId) {
    return null;
  }

  return (
    <>
      <script
        async
        data-analytics="provider"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(providerId)}`}
      />
      <script
        data-analytics="init"
        // 방문 통계 초기화 코드. 개인정보는 보내지 않는다. (BLUEPRINT 10장)
        dangerouslySetInnerHTML={{
          __html: [
            "window.dataLayer = window.dataLayer || [];",
            "function gtag(){dataLayer.push(arguments);}",
            "gtag('js', new Date());",
            `gtag('config', ${JSON.stringify(providerId)}, { anonymize_ip: true });`,
          ].join("\n"),
        }}
      />
    </>
  );
}

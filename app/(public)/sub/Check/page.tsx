import { ReservationLookup } from "@/components/public/reservation-lookup";
import { PageBanner } from "@/components/ui/page-banner";
import { buildPageMetadata, pageTitle } from "@/lib/metadata";

/**
 * PG-011 예약 확인 / 취소.
 * 근거: docs/evidence/dom/phase1-check.yml — 배너 문구, 입력란, 주의사항 5개. (EV-0008)
 */
export const metadata = buildPageMetadata({
  title: pageTitle("예약 확인 / 취소"),
  description:
    "신청하신 설명회의 예약 내역을 확인하고 안전하게 취소 처리를 진행하실 수 있습니다.",
  path: "/sub/Check",
});

/** 레거시 안내 문구 원문. (EV-0008) */
const CAUTIONS = [
  {
    title: "좌석 선점 및 마감 기준:",
    body: "대치동 지점별 설명회 좌석은 한정되어 있어 선착순 예약 확정 방식으로 운영됩니다. 공석 없는 올바른 입시 정보 공유를 위해 신중한 예약을 부탁드립니다.",
  },
  {
    title: "예약 취소 가능 기한:",
    body: "현장 좌석 배치 및 노쇼 대비 대기자 배정을 위해, 취소는 설명회 개최 전날 오후 6시까지만 가능합니다. 당일 취소는 시스템상 불가능하오니 양해 바랍니다.",
  },
  {
    title: "당일 노쇼(No-Show) 불이익 안내:",
    body: "사전 취소 없이 불참(노쇼)하시는 경우, 향후 아카데미에서 주관하는 차기 입시 설명회 및 1:1 유료 전략 컨설팅 예약 우선순위에서 제외되는 패널티가 적용될 수 있습니다.",
  },
  {
    title: "안내 문자 발송 트랙:",
    body: "예약 및 취소가 정상 완료되면 학부모님 연락처로 카카오 알림톡 또는 확인 문자가 실시간 자동 발송됩니다. 문자를 받지 못하셨을 경우 학원 상담실로 직접 연락 주시기 바랍니다.",
  },
  {
    title: "자료집 대리 수령 불가:",
    body: "설명회 핵심 배치표 및 한정판 전략 자료집은 현장 참석자에게만 1인 1부 제공되며, 불참 시 별도로 우편 발송되거나 대리 수령이 불가능합니다.",
  },
] as const;

export default function ReservationCheckPage() {
  return (
    <>
      <PageBanner
        title="예약 확인 / 취소"
        description="신청하신 설명회의 예약 내역을 확인하고 안전하게 취소 처리를 진행하실 수 있습니다."
      />
      <ReservationLookup />

      <section className="bg-canvas pb-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-xl border border-line bg-surface p-6">
            <h2 className="text-base font-bold text-ink">
              설명회 예약 및 취소 시 주의사항 (필독)
            </h2>
            {/* 레거시 문구를 그대로 둔다. 문자 발송은 D4에서 "발송 없음"으로 정해져 있어
                운영자 확인 후 문구를 고쳐야 한다. // ASM-053 */}
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
              {CAUTIONS.map((caution) => (
                <li key={caution.title}>
                  • <strong className="font-bold text-ink">{caution.title}</strong>{" "}
                  {caution.body}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

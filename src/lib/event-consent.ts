import { COURSE_PRIVACY_CONSENT } from "@/lib/contracts";

/**
 * FM-002 설명회 예약 폼의 동의 안내 문구.
 *
 * 레거시 설명회 폼은 관찰하지 못했고(접수 가능한 일정 없음, EV-0005) 공유 계약에도
 * 설명회용 문구 상수가 없다. ASM-009("설명회도 강좌와 같은 기본 보존 기준을 쓴다")에 따라
 * 강좌 동의 문구를 바탕으로 설명회에 맞게 목적·수집항목·보유기간만 바꿨다. // ASM-052
 *
 * 계약으로 옮길 필요가 있으면 조정자가 `src/lib/contracts/applications.ts` 로 이동한다.
 */
export const EVENT_PRIVACY_CONSENT = {
  heading: COURSE_PRIVACY_CONSENT.heading,
  purpose: "설명회 좌석 배정 관리 및 예약 확정 안내",
  collectedItems: "이름, 휴대폰 번호, 학생 학년, 참석 인원",
  retention: "해당 설명회 종료 및 안내 완료 시점 즉시 파기",
  checkboxLabel: COURSE_PRIVACY_CONSENT.checkboxLabel,
  submitLabel: "설명회 예약 신청서 제출하기",
} as const;

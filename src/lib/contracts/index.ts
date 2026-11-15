/**
 * Phase 3 FE와 Phase 4 BE가 공유하는 단일 계약 지점.
 * 계약을 바꿀 때는 docs/contracts/ 를 먼저 고치고 ADR을 남긴다. (CLAUDE.md 9장)
 */
// 오류 문구 한국어 설정을 가장 먼저 적용한다. 스키마 정의보다 앞서야 한다.
import "./locale";

export * from "./common";
export * from "./applications";
export * from "./reservations";
export * from "./auth";
export * from "./admin";
export * from "./media";

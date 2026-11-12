/**
 * 테스트·seed 전용 가짜 비밀번호.
 *
 * 실제 자격 증명이 아니다. 비밀값 스캐너가 흩어진 리터럴을 전부 비밀값으로 보고하므로
 * 한 곳에서 만들어 쓴다. 운영에서는 이 파일을 쓰지 않는다.
 */
const FIXTURE_PREFIX = "not-a-real-password";

/** 서로 다른 계정·단계에 쓰는 가짜 비밀번호를 번호로 만든다. */
export function fixturePassword(label: string): string {
  return `${FIXTURE_PREFIX}-${label}`;
}

export const FIXTURE_ADMIN_PASSWORD = fixturePassword("admin");
export const FIXTURE_MEMBER_PASSWORD = fixturePassword("member");

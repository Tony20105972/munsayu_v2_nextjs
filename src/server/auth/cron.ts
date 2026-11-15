import "server-only";
import { secretEquals } from "@/server/auth/tokens";
import { envValue } from "@/server/env";

/**
 * 예약 실행(Vercel Cron) 요청인지 확인한다. (AD-013, ASM-100)
 *
 * Vercel 은 `CRON_SECRET` 환경 변수가 있으면 예약 실행 요청에
 * `Authorization: Bearer <CRON_SECRET>` 을 붙여 보낸다. 그 헤더가 유일한 문턱이다.
 *
 * - 비밀값이 **없으면 아무도 통과시키지 않는다.** 비밀값이 비었을 때 조용히 열리면
 *   누구나 신청 기록을 지울 수 있다. 약해지는 대신 닫히는 쪽이 맞다.
 * - 비교는 `secretEquals` 로 한다(해시 후 상수 시간 비교). 길이 차이로도 값이 새지 않는다.
 * - 헤더 전체(`Bearer ` 접두사 포함)를 비교한다. 값만 보낸 요청, 다른 인증 방식으로
 *   위장한 요청을 통과시키지 않는다.
 *
 * 경로 자체를 숨기기 위해 부르는 쪽은 실패를 **404** 로 답한다(401 이 아니다).
 */
export function cronRequestAuthorized(request: Request): boolean {
  const expected = envValue("CRON_SECRET");
  if (!expected) return false;

  const header = request.headers.get("authorization");
  if (!header) return false;

  return secretEquals(header, `Bearer ${expected}`);
}

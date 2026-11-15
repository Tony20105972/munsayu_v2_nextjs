import { connection } from "next/server";
import { cronRequestAuthorized } from "@/server/auth/cron";
import { isAutomaticPurgeEnabled, runPurge } from "@/server/services/privacy";

/**
 * AD-013 보존 기간이 지난 개인정보를 지우는 **예약 실행** 경로. (Phase 7)
 *
 * `vercel.json` 의 `crons` 가 하루 한 번 이 주소를 **GET** 으로 부른다. Vercel 의
 * 예약 실행은 GET 만 보내고 본문을 싣지 못해, 관리자 화면이 쓰는
 * `POST /api/admin/privacy/purge` 를 그대로 쓸 수 없다. 그래서 경로를 따로 둔다.
 *
 * 확인은 `CRON_SECRET` 하나뿐이다. Vercel 은 이 환경 변수가 있으면 예약 실행 요청에
 * `Authorization: Bearer <CRON_SECRET>` 을 붙여 보낸다. 값이 없으면 **아무도
 * 통과시키지 않는다.** 비밀값이 없을 때 조용히 열어 두면 누구나 파기를 돌릴 수 있다.
 *
 * **관리자 설정의 「자동 파기 사용」이 꺼져 있으면 아무것도 지우지 않는다.** 이 확인이 없으면
 * 스위치가 꺼져 있어도 매일 새벽에 기록이 지워진다. `runPurge` 는 파기 대상 시각
 * (`purgeEligibleAt`)만 보고 지우고, 그 시각은 스위치와 **무관하게** 관리자가 「파기 예약」으로
 * 설정하기 때문이다. 파기는 되돌릴 수 없어서, 사람이 켜지 않은 자동 실행은 돌지 않아야 한다.
 * 기본값은 꺼짐이다 (Q-ADM-12).
 *
 * `cacheComponents` 를 켠 설정에서는 `dynamic = "force-dynamic"` 을 쓸 수 없다(빌드가 거부한다).
 * 대신 `connection()` 을 기다려 **요청이 올 때마다 실행**되게 한다. 이게 없으면 빌드가 이 경로를
 * 미리 만들어 두고(`○ Static`), 예약 실행이 빌드 때 계산된 응답만 받아 **파기가 돌지 않는다.**
 */

export async function GET(request: Request): Promise<Response> {
  await connection();

  if (!cronRequestAuthorized(request)) {
    // 경로가 있는지조차 알려 주지 않는다.
    return new Response("Not Found", { status: 404 });
  }

  if (!(await isAutomaticPurgeEnabled())) {
    // 지우지 않았다는 사실을 남긴다. 200 으로 답해 예약 실행이 실패로 재시도되지 않게 한다.
    return Response.json(
      { skipped: true, reason: "automatic-purge-disabled" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  // 사람이 누른 것이 아니므로 행위자는 비워 둔다. 출처는 감사기록에 "예약 실행"으로 남는다.
  const result = await runPurge({
    actorUserId: null,
    dryRun: false,
    source: "SCHEDULED",
  });

  // 지운 건수만 남긴다. 어떤 사람의 기록이었는지는 남기지 않는다. (CLAUDE.md 4장)
  return Response.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

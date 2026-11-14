import Image from "next/image";
import {
  InstructorCreateForm,
  InstructorDeleteButton,
  InstructorEditForm,
  MembershipOrderForm,
  MembershipRemoveButton,
  TeamCreateForm,
  TeamMembershipForm,
} from "@/components/admin/instructors-panels";
import {
  ADMIN_TABLE_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminEmptyRow,
  AdminPageHeading,
  AdminPanel,
  AdminTableScroll,
} from "@/components/admin/ui";
import { listInstructors, listTeams } from "@/server/services/instructors";
import { listMediaOptions } from "@/server/services/media";
import { resolveInstructorPhoto } from "@/lib/images";

/**
 * AD-006 강사 관리.
 *
 * 레거시는 같은 강사를 팀마다 따로 등록했다(김윤환 원장 = KYH 대치팀 / KimYH 분당팀,
 * EV-ADM-04). 신규 설계는 **강사 1명 : 소속 팀 여러 개**이고 노출 순서는 팀마다 따로
 * 둔다. (Q-ADM-04 답변, ASM-003) 화면에서 이 관계가 바로 보이도록 강사 줄마다 소속
 * 팀과 그 팀에서의 순서를 함께 보여 준다.
 *
 * 사진은 「이미지 관리」 보관함(AD-015)에서 고른다. 고르지 않으면 공개 화면이
 * 레거시 사진이나 기본 이미지를 쓴다.
 */
export const instant = false;

export default async function AdminInstructorsPage() {
  const [instructors, teams, photoChoices] = await Promise.all([
    listInstructors(),
    listTeams(),
    listMediaOptions(),
  ]);

  const instructorOptions = instructors.map((instructor) => ({
    value: instructor.id,
    label: `${instructor.name} (${instructor.profileCode})`,
  }));
  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));

  const multiTeamInstructors = instructors.filter(
    (instructor) => instructor.teams.length > 1,
  );

  return (
    <>
      <AdminPageHeading
        featureId="AD-006"
        title="강사 관리"
        description="강사 한 명을 한 번만 등록하고, 소속 팀은 여러 개 붙입니다. 노출 순서는 팀마다 따로 정합니다."
      />

      <AdminPanel title="강사와 팀의 관계" headingId="instructor-model">
        <ul className="space-y-1 text-sm leading-relaxed text-ink">
          <li>· 강사 한 명을 여러 팀에 넣을 수 있습니다.</li>
          <li>
            · 노출 순서는 <strong className="font-bold">팀마다 따로</strong> 저장됩니다.
            같은 강사가 대치팀에서는 1번, 분당팀에서는 3번일 수 있습니다.
          </li>
          <li>
            · 지금 두 팀 이상에 속한 강사:{" "}
            {multiTeamInstructors.length === 0 ? (
              <span className="text-muted">없음</span>
            ) : (
              multiTeamInstructors
                .map(
                  (instructor) =>
                    `${instructor.name} → ${instructor.teams
                      .map((team) => `${team.teamName}(${team.displayOrder}번)`)
                      .join(", ")}`,
                )
                .join(" / ")
            )}
          </li>
        </ul>
      </AdminPanel>

      <AdminPanel
        title={`강사 목록 (${instructors.length}명)`}
        headingId="instructor-list"
      >
        <AdminTableScroll>
          <table className={ADMIN_TABLE_CLASS}>
            <caption className="sr-only">강사 목록</caption>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  사진
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  성명
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  고유 코드
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  소속 팀 (팀별 노출 순서)
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  약력 요약
                </th>
              </tr>
            </thead>
            <tbody>
              {instructors.length === 0 ? (
                <AdminEmptyRow colSpan={5} label="등록된 강사가 없습니다." />
              ) : (
                instructors.map((instructor) => {
                  const photo = resolveInstructorPhoto(instructor);

                  return (
                    <tr key={instructor.id}>
                      <td className={ADMIN_TD_CLASS}>
                        <Image
                          src={photo.src}
                          alt={photo.alt}
                          width={48}
                          height={64}
                          className="h-16 w-12 rounded-md object-cover"
                        />
                        {instructor.photoMediaId ? null : (
                          <span className="mt-1 block text-xs text-muted">
                            기본 이미지
                          </span>
                        )}
                      </td>
                      <th scope="row" className={`${ADMIN_TD_CLASS} font-bold`}>
                        {instructor.name}
                      </th>
                      <td className={`${ADMIN_TD_CLASS} font-mono`}>
                        {instructor.profileCode}
                      </td>
                      <td className={ADMIN_TD_CLASS}>
                        {instructor.teams.length === 0 ? (
                          <span className="text-muted">소속 없음</span>
                        ) : (
                          <ul className="space-y-1">
                            {instructor.teams.map((team) => (
                              <li
                                key={team.teamId}
                                className="flex flex-wrap items-center gap-1"
                              >
                                <span className="font-bold text-ink">
                                  {team.teamName}
                                </span>
                                <MembershipOrderForm
                                  instructorId={instructor.id}
                                  teamId={team.teamId}
                                  displayOrder={team.displayOrder}
                                />
                                <MembershipRemoveButton
                                  instructorId={instructor.id}
                                  teamId={team.teamId}
                                  instructorName={instructor.name}
                                  teamName={team.teamName}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className={`${ADMIN_TD_CLASS} max-w-sm`}>
                        <p className="line-clamp-3 whitespace-pre-line text-muted">
                          {instructor.bio ?? "-"}
                        </p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-bold text-brand">
                            수정
                          </summary>
                          <div className="mt-3 space-y-3 rounded-md border border-line bg-canvas p-3">
                            <InstructorEditForm
                              instructorId={instructor.id}
                              name={instructor.name}
                              profileCode={instructor.profileCode}
                              bio={instructor.bio}
                              photoMediaId={instructor.photoMediaId}
                              photoChoices={photoChoices}
                            />
                            <InstructorDeleteButton
                              instructorId={instructor.id}
                              name={instructor.name}
                            />
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </AdminPanel>

      <AdminPanel title="강사 추가" headingId="instructor-create">
        <p className="mb-3 text-xs text-muted">
          사진은 「이미지 관리」에서 먼저 올린 뒤 아래에서 고릅니다.
        </p>
        <InstructorCreateForm photoChoices={photoChoices} />
      </AdminPanel>

      <AdminPanel
        title="소속 지정 · 노출 순서"
        headingId="instructor-membership"
        description="이미 있는 (강사, 팀) 짝에 다시 저장하면 노출 순서만 바뀝니다."
      >
        {instructors.length === 0 || teams.length === 0 ? (
          <p className="text-sm text-muted">
            강사와 팀이 각각 하나 이상 있어야 소속을 지정할 수 있습니다.
          </p>
        ) : (
          <TeamMembershipForm
            instructorOptions={instructorOptions}
            teamOptions={teamOptions}
          />
        )}
      </AdminPanel>

      <AdminPanel title={`팀 (${teams.length}개)`} headingId="team-list">
        <AdminTableScroll>
          <table className={ADMIN_TABLE_CLASS}>
            <caption className="sr-only">팀 목록</caption>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  팀 이름
                </th>
                <th scope="col" className={ADMIN_TH_CLASS}>
                  소속 강사 (노출 순서대로)
                </th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <AdminEmptyRow colSpan={2} label="등록된 팀이 없습니다." />
              ) : (
                teams.map((team) => (
                  <tr key={team.id}>
                    <th scope="row" className={`${ADMIN_TD_CLASS} font-bold`}>
                      {teamNameById.get(team.id)}
                    </th>
                    <td className={ADMIN_TD_CLASS}>
                      {team.instructors.length === 0 ? (
                        <span className="text-muted">소속 강사 없음</span>
                      ) : (
                        team.instructors
                          .map(
                            (instructor) =>
                              `${instructor.displayOrder}. ${instructor.name}`,
                          )
                          .join(" / ")
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>

        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm font-bold text-ink">팀 추가</h3>
          <div className="mt-3">
            <TeamCreateForm />
          </div>
        </div>
      </AdminPanel>
    </>
  );
}

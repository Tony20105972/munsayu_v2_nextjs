import "server-only";
import { listCampuses, listPublicCourses } from "@/server/services/courses";
import { listPublicEvents } from "@/server/services/events";
import { listInstructors } from "@/server/services/instructors";
import { getRetentionSetting } from "@/server/services/privacy";
import type { Campus } from "@/lib/site-config";
import {
  groupCoursesByGrade,
  groupEventsByCampus,
  selectInstructorsByTeamKeyword,
  toInstructorCardView,
  type CourseGroupView,
  type EventGroupView,
  type InstructorCardView,
} from "@/lib/view-models";

/**
 * 공개 화면이 쓰는 읽기 전용 조회.
 *
 * Server Component 에서 서비스 함수를 직접 부른다. HTTP 왕복이 없고 타입이 그대로 이어진다.
 * (Route Handler 는 외부 호출용 공개 API 로 남긴다 — MIGRATION_PLAN 5장)
 */

/**
 * 지점 식별자는 DB가 만든 값이므로 경로(`/sub/schedule.n`)에 박힌 값과 다르다.
 * 화면은 `src/lib/site-config.ts` 의 지점 이름으로 DB 지점을 찾는다. // ASM-075
 */
async function resolveCampusId(campusName: Campus["name"]): Promise<string | null> {
  const campuses = await listCampuses();
  return campuses.find((campus) => campus.name === campusName)?.id ?? null;
}

/** PG-008 / PG-009 지점별 시간표. 학년 묶음은 출력순서를 그대로 유지한다. */
export async function loadTimetable(
  campusName: Campus["name"],
): Promise<CourseGroupView[]> {
  const campusId = await resolveCampusId(campusName);
  if (!campusId) {
    return [];
  }

  return groupCoursesByGrade(await listPublicCourses({ campusId }));
}

/** PG-010 설명회 목록. 지점 순서대로 묶고 지점 없는 설명회는 마지막에 모은다. */
export async function loadEventGroups(): Promise<EventGroupView[]> {
  const [campuses, events] = await Promise.all([listCampuses(), listPublicEvents({})]);

  return groupEventsByCampus(
    events,
    campuses.map((campus) => campus.name),
  );
}

/** PG-005 전체 강사진. */
export async function loadInstructors(): Promise<InstructorCardView[]> {
  const instructors = await listInstructors();
  return instructors.map(toInstructorCardView);
}

/** PG-006 분당점 강사진. 팀 이름에 `분당` 이 들어간 강사만 추린다. // ASM-043 */
export async function loadBundangInstructors(): Promise<InstructorCardView[]> {
  const instructors = await listInstructors();
  return selectInstructorsByTeamKeyword(instructors, "분당");
}

/**
 * BZ-002 동의 안내의 「보유기간」에 쓰는 현재 문구.
 * 관리자 보존 설정이 단일 원본이고, 신청·예약 모달이 이 값을 그대로 보여 준다.
 */
export async function loadRetentionPolicies(): Promise<{
  course: string;
  event: string;
  consultation: string;
  instructor: string;
  sms: string;
}> {
  const setting = await getRetentionSetting();
  return {
    course: setting.courseRetentionPolicy,
    event: setting.eventRetentionPolicy,
    consultation: setting.consultationRetentionPolicy,
    instructor: setting.instructorRetentionPolicy,
    sms: setting.smsRetentionPolicy,
  };
}

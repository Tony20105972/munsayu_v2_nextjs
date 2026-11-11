import Link from "next/link";
import { readAnalyticsProviderId } from "@/components/layout/analytics-script";
import { AdminPageHeading, AdminPanel } from "@/components/admin/ui";
import { listAdminCourses } from "@/server/services/courses";
import { listPublicEvents } from "@/server/services/events";
import { listInstructors, listTeams } from "@/server/services/instructors";
import { memberCountsByStatus } from "@/server/services/members";
import { getRetentionSetting } from "@/server/services/privacy";

/** 세션과 DB 집계를 요청마다 읽으므로 미리 렌더하지 않는다. */
export const instant = false;

/**
 * 관리자 개요. 각 관리 화면으로 가는 입구와 숫자 요약만 보여 준다.
 * 숫자에는 개인정보가 없다. (BLUEPRINT 10장)
 */
const SECTIONS = [
  {
    href: "/admin/members",
    featureId: "AD-002",
    title: "회원 관리",
    description: "회원 검색·상태 변경, 관리자 계정 추가·삭제",
  },
  {
    href: "/admin/events",
    featureId: "AD-003 ~ AD-005",
    title: "설명회 관리",
    description: "설명회 추가·수정·삭제, 상태 변경, 예약 건수와 참석 인원 집계",
  },
  {
    href: "/admin/instructors",
    featureId: "AD-006",
    title: "강사 관리",
    description: "강사 프로필, 팀, 팀별 노출 순서",
  },
  {
    href: "/admin/courses",
    featureId: "AD-007",
    title: "시간표·강좌 관리",
    description: "지점별 강좌 추가·수정·삭제, 접수중/접수마감 전환",
  },
  {
    href: "/admin/applications",
    featureId: "AD-008",
    title: "신청 목록",
    description: "강좌 신청·설명회 예약 목록(가린 값), 원문 보기, CSV 내보내기",
  },
  {
    href: "/admin/privacy",
    featureId: "AD-013",
    title: "개인정보 관리",
    description: "보존 설정, 파기 대상 시각, 파기 실행(미리 세기 먼저)",
  },
  {
    href: "/admin/analytics",
    featureId: "AD-012",
    title: "분석 도구",
    description: "방문 통계 도구 연동 설정 여부 확인",
  },
] as const;

export default async function AdminHomePage() {
  const [memberCounts, courses, events, instructors, teams, retention] =
    await Promise.all([
      memberCountsByStatus(),
      listAdminCourses({ page: 1, pageSize: 1 }),
      listPublicEvents({}),
      listInstructors(),
      listTeams(),
      getRetentionSetting(),
    ]);

  const analyticsConfigured = readAnalyticsProviderId() !== null;
  const openEvents = events.filter((event) => !event.isClosed).length;

  const summary = [
    { label: "회원(이용 중)", value: `${memberCounts.ACTIVE}명` },
    { label: "회원(차단)", value: `${memberCounts.BLOCKED}명` },
    { label: "회원(탈퇴)", value: `${memberCounts.WITHDRAWN}명` },
    { label: "등록 강좌", value: `${courses.total}개` },
    { label: "설명회(전체 / 접수 가능)", value: `${events.length} / ${openEvents}개` },
    { label: "강사 / 팀", value: `${instructors.length} / ${teams.length}` },
    {
      label: "자동 파기",
      value: retention.automaticPurgeEnabled ? "켜짐" : "꺼짐(기본값)",
    },
    { label: "분석 도구 ID", value: analyticsConfigured ? "설정됨" : "설정 안 됨" },
  ];

  return (
    <>
      <AdminPageHeading
        featureId="AD-001"
        title="관리자 개요"
        description="업무 화면 입구입니다. 아래 숫자에는 개인정보가 들어 있지 않습니다."
      />

      <AdminPanel title="현재 상태" headingId="admin-summary">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((item) => (
            <div key={item.label} className="rounded-md border border-line px-3 py-2">
              <dt className="text-xs text-muted">{item.label}</dt>
              <dd className="mt-1 text-base font-bold text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      </AdminPanel>

      <AdminPanel title="관리 화면" headingId="admin-sections">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="block h-full rounded-md border border-line px-4 py-3 hover:border-brand hover:bg-canvas"
              >
                <p className="text-xs font-bold tracking-wider text-muted">
                  {section.featureId}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">{section.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {section.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel
        title="이번 범위에 없는 레거시 메뉴"
        headingId="admin-out-of-scope"
        description="레거시 관리자 메뉴 가운데 화면을 확인하지 못해 옮기지 않은 것들입니다."
      >
        <ul className="space-y-1 text-sm text-muted">
          <li>
            AD-009 입학진단관리 — 문해력 진단은 외부 설문 링크를 그대로 씁니다. (RT-003)
          </li>
          <li>
            AD-010 문자신청내역 — 공개 증거가 없어 범위에서 제외했습니다. (ASM-007)
          </li>
          <li>AD-011 강사지원관리 — 같은 이유로 제외했습니다. (ASM-007)</li>
          <li>
            접속자집계·접속자검색 — 자체 집계 대신 분석 도구 연동 자리만 둡니다.
            (AD-012, ASM-004)
          </li>
          <li>공지 작성·수정 — 공개 읽기만 구현했습니다. (ASM-015)</li>
        </ul>
      </AdminPanel>
    </>
  );
}

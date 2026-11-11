/**
 * 서버 서비스가 돌려주는 값을 화면에서 바로 쓸 수 있는 형태로 바꾼다.
 *
 * - 이 파일은 클라이언트 컴포넌트에서도 import 하므로 서버 모듈을 끌어오지 않는다.
 *   입력 타입은 `src/server/services/*` 의 반환 타입과 같은 모양으로 따로 적는다.
 * - 날짜 문구는 모두 `Asia/Seoul` 기준으로 만든다. 서버·브라우저 시간대가 달라도
 *   같은 문구가 나와야 시각 회귀 테스트가 흔들리지 않는다.
 */

const SEOUL = "Asia/Seoul";

type DateParts = {
  year: string;
  month: string;
  day: string;
  weekday: string;
  hour: string;
  minute: string;
};

const PART_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SEOUL,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toParts(iso: string): DateParts | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const found: Record<string, string> = {};
  for (const part of PART_FORMATTER.formatToParts(parsed)) {
    found[part.type] = part.value;
  }

  return {
    year: found.year ?? "",
    month: found.month ?? "",
    day: found.day ?? "",
    // ko-KR 의 short weekday 는 `토`, `(토)` 가 아니라 `토` 한 글자다.
    weekday: (found.weekday ?? "").replace(/[^가-힣]/g, ""),
    hour: found.hour ?? "",
    minute: found.minute ?? "",
  };
}

/** 강좌 개강일 표기. 레거시 형식 `11월 17일(화)` 를 따른다. (EV-0006) */
export function formatCourseStartDate(iso: string | null): string {
  if (!iso) {
    return "개강일 추후 안내";
  }

  const parts = toParts(iso);
  if (!parts) {
    return "개강일 추후 안내";
  }

  return `${parts.month}월 ${parts.day}일(${parts.weekday})`;
}

/** 설명회 일시 표기. 레거시 형식 `2026년 12월 5일 (토) 11:00` 를 따른다. (EV-0005) */
export function formatEventStartsAt(iso: string): string {
  const parts = toParts(iso);
  if (!parts) {
    return "일시 추후 안내";
  }

  return `${parts.year}년 ${parts.month}월 ${parts.day}일 (${parts.weekday}) ${parts.hour}:${parts.minute}`;
}

/** 공지 목록의 날짜 표기. 레거시는 `11-03` 처럼 월-일만 보여 준다. (EV-0007) */
export function formatNoticeListDate(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const parts = toParts(iso);
  if (!parts) {
    return "";
  }

  return `${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`;
}

/** 공지 상세의 날짜 표기. */
export function formatNoticeDetailDate(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const parts = toParts(iso);
  if (!parts) {
    return "";
  }

  return `${parts.year}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`;
}

/** 관리자 화면의 날짜·시각 표기. */
export function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "-";
  }

  const parts = toParts(iso);
  if (!parts) {
    return "-";
  }

  return `${parts.year}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")} ${parts.hour}:${parts.minute}`;
}

/** `<input type="datetime-local">` 의 기본값. 초 단위는 쓰지 않는다. */
export function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const parts = toParts(iso);
  if (!parts) {
    return "";
  }

  const month = parts.month.padStart(2, "0");
  const day = parts.day.padStart(2, "0");
  return `${parts.year}-${month}-${day}T${parts.hour}:${parts.minute}`;
}

/** `<input type="date">` 의 기본값. */
export function toDateInputValue(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const parts = toParts(iso);
  if (!parts) {
    return "";
  }

  return `${parts.year}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* 시간표 (PG-008 / PG-009)                                            */
/* ------------------------------------------------------------------ */

/** `listPublicCourses()` 결과 1건과 같은 모양. */
type PublicCourseLike = {
  id: string;
  campusName: string;
  title: string;
  sectionTitle: string | null;
  gradeTitle: string | null;
  scheduleText: string | null;
  startDate: string | null;
  intakeOpen: boolean;
};

export type CourseCardView = {
  id: string;
  campusName: string;
  /** 카드 머리글. 레거시는 모든 카드가 `문해와 사유` 였고 지금은 구분 섹션 값을 쓴다. (EV-0006) */
  sectionTitle: string;
  /** 학년 묶음 제목. 예: `초등학교 4학년` */
  gradeTitle: string;
  title: string;
  scheduleText: string;
  startDateText: string;
  intakeOpen: boolean;
};

const UNCLASSIFIED_GRADE = "학년 구분 없음";

export function toCourseCardView(course: PublicCourseLike): CourseCardView {
  return {
    id: course.id,
    campusName: course.campusName,
    sectionTitle: course.sectionTitle ?? "정규강좌",
    gradeTitle: course.gradeTitle ?? UNCLASSIFIED_GRADE,
    title: course.title,
    scheduleText: course.scheduleText ?? "일정 추후 안내",
    startDateText: formatCourseStartDate(course.startDate),
    intakeOpen: course.intakeOpen,
  };
}

export type CourseGroupView = {
  gradeTitle: string;
  courses: CourseCardView[];
};

/** 학년 묶음 순서를 서비스가 준 출력순서 그대로 유지한 채 그룹으로 나눈다. */
export function groupCoursesByGrade(
  courses: readonly PublicCourseLike[],
): CourseGroupView[] {
  const groups: CourseGroupView[] = [];

  for (const course of courses) {
    const view = toCourseCardView(course);
    const existing = groups.find((group) => group.gradeTitle === view.gradeTitle);
    if (existing) {
      existing.courses.push(view);
    } else {
      groups.push({ gradeTitle: view.gradeTitle, courses: [view] });
    }
  }

  return groups;
}

/* ------------------------------------------------------------------ */
/* 설명회 (PG-010)                                                     */
/* ------------------------------------------------------------------ */

/** `listPublicEvents()` 결과 1건과 같은 모양. */
type PublicEventLike = {
  id: string;
  campusName: string | null;
  title: string;
  startsAt: string;
  venue: string | null;
  statusLabel: string;
  isClosed: boolean;
};

export type EventCardView = {
  id: string;
  /** 모달 제목에 쓰는 지점 표기. 지점이 없는 설명회는 학원 이름을 쓴다. */
  campusName: string;
  venueName: string;
  title: string;
  startsAtText: string;
  /** 관리자가 직접 바꾸는 상태 이름 (ASM-001) */
  statusLabel: string;
  isClosed: boolean;
};

/** 지점이 지정되지 않은 설명회(온라인 등)의 묶음 제목. // ASM-071 */
export const EVENT_GROUP_WITHOUT_CAMPUS = "지점 공통 / 온라인";

export function toEventCardView(event: PublicEventLike): EventCardView {
  return {
    id: event.id,
    campusName: event.campusName ?? EVENT_GROUP_WITHOUT_CAMPUS,
    venueName: event.venue ?? "장소 추후 안내",
    title: event.title,
    startsAtText: formatEventStartsAt(event.startsAt),
    statusLabel: event.statusLabel,
    isClosed: event.isClosed,
  };
}

export type EventGroupView = {
  campusName: string;
  events: EventCardView[];
};

/**
 * 지점 순서대로 묶고, 지점이 없는 설명회는 마지막 묶음에 모은다. // ASM-071
 * 지점이 하나도 없는 묶음도 `예정된 설명회가 없습니다.` 를 보여 주기 위해 남긴다.
 */
export function groupEventsByCampus(
  events: readonly PublicEventLike[],
  campusNames: readonly string[],
): EventGroupView[] {
  const views = events.map(toEventCardView);

  const groups: EventGroupView[] = campusNames.map((campusName) => ({
    campusName,
    events: views.filter((event) => event.campusName === campusName),
  }));

  const withoutCampus = views.filter(
    (event) => event.campusName === EVENT_GROUP_WITHOUT_CAMPUS,
  );
  if (withoutCampus.length > 0) {
    groups.push({
      campusName: EVENT_GROUP_WITHOUT_CAMPUS,
      events: withoutCampus,
    });
  }

  return groups;
}

/* ------------------------------------------------------------------ */
/* 공지 (PG-012)                                                       */
/* ------------------------------------------------------------------ */

/** `listNotices()` 결과 1건과 같은 모양. */
type NoticeLike = {
  id: string;
  title: string;
  isPinned: boolean;
  publishedAt: string | null;
};

/**
 * 레거시 목록에는 작성자 칸이 있고 값은 모두 `문사유` 였다. (EV-0007)
 * 신규 공지 모델에는 작성자 칸이 없어 학원 이름을 고정으로 보여 준다. // ASM-070
 */
export const NOTICE_AUTHOR_LABEL = "문사유";

export type NoticeRowView = {
  id: string;
  pinned: boolean;
  /** 고정 글은 번호 대신 `공지` 배지를 보여 주므로 null 이다. */
  listNumber: number | null;
  title: string;
  author: string;
  dateText: string;
};

/**
 * 목록 번호는 고정 글을 뺀 나머지를 최신순으로 큰 번호부터 센다.
 * 페이지가 넘어가도 번호가 이어지도록 전체 건수와 현재 페이지를 함께 받는다.
 */
export function toNoticeRowViews(
  notices: readonly NoticeLike[],
  options: { total: number; page: number; pageSize: number },
): NoticeRowView[] {
  const pinnedTotal = notices.filter((notice) => notice.isPinned).length;
  const offset = (options.page - 1) * options.pageSize;
  let plainIndex = 0;

  return notices.map((notice) => {
    let listNumber: number | null = null;
    if (!notice.isPinned) {
      listNumber = options.total - pinnedTotal - offset - plainIndex;
      plainIndex += 1;
    }

    return {
      id: notice.id,
      pinned: notice.isPinned,
      listNumber,
      title: notice.title,
      author: NOTICE_AUTHOR_LABEL,
      dateText: formatNoticeListDate(notice.publishedAt),
    };
  });
}

/** 공지 본문은 한 칸 띈 줄을 단락 구분으로 본다. */
export function toParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/* ------------------------------------------------------------------ */
/* 강사진 (PG-005 / PG-006)                                            */
/* ------------------------------------------------------------------ */

/** `listInstructors()` 결과 1건과 같은 모양. */
type InstructorLike = {
  id: string;
  name: string;
  bio: string | null;
  teams: { teamId: string; teamName: string; displayOrder: number }[];
};

export type InstructorCardView = {
  id: string;
  name: string;
  /** 카드 머리글. 소속 팀 이름을 이어 붙인다. */
  affiliation: string;
  careers: string[];
};

/** 소속 팀이 없는 강사의 머리글. */
const DEFAULT_AFFILIATION = "문해와 사유 강사";

/**
 * 강사 약력은 한 칸에 여러 줄로 저장되므로 줄 단위로 끊어 목록으로 보여 준다. // ASM-072
 * 소속은 팀 이름을 노출 순서대로 이어 붙인다. 한 강사가 여러 팀에 속할 수 있다. (ASM-003)
 */
export function toInstructorCardView(instructor: InstructorLike): InstructorCardView {
  const teamNames = [...instructor.teams]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((team) => team.teamName);

  return {
    id: instructor.id,
    name: instructor.name,
    affiliation: teamNames.length > 0 ? teamNames.join(" · ") : DEFAULT_AFFILIATION,
    careers: (instructor.bio ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  };
}

/** 팀 이름에 지점 이름이 들어간 강사만 추린다. 팀별 노출 순서를 따른다. // ASM-043 */
export function selectInstructorsByTeamKeyword(
  instructors: readonly InstructorLike[],
  keyword: string,
): InstructorCardView[] {
  return instructors
    .filter((instructor) =>
      instructor.teams.some((team) => team.teamName.includes(keyword)),
    )
    .sort((left, right) => {
      const leftOrder =
        left.teams.find((team) => team.teamName.includes(keyword))?.displayOrder ?? 0;
      const rightOrder =
        right.teams.find((team) => team.teamName.includes(keyword))?.displayOrder ?? 0;
      return leftOrder - rightOrder;
    })
    .map(toInstructorCardView);
}

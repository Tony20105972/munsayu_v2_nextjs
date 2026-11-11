/**
 * Phase 3 FE 단독 구현용 임시 데이터·호출 지점.
 *
 * - 이 파일 밖에서는 서버 의존 읽기/쓰기를 하지 않는다. (docs/contracts/phase-3-4-ownership.md)
 * - 모든 함수와 데이터에 `STUB:` 주석으로 무엇을 어떤 API·서비스로 바꿀지 적는다.
 * - 통합(C-3) 단계에서 `grep -rn "STUB" src app` 결과가 0건이어야 한다.
 * - 콘텐츠 값은 docs/evidence 의 레거시 관찰값을 그대로 쓰되, 관찰되지 않은 항목은
 *   최소한의 사실만 적고 `미관찰`임을 주석으로 남긴다.
 */

import type {
  ApplicationCreatedResult,
  CourseApplicationInput,
  EventReservationInput,
  ReservationCancelInput,
  ReservationLookupInput,
  ReservationLookupResult,
  SessionUser,
} from "@/lib/contracts";
import type { Campus } from "@/lib/site-config";

export type CampusId = Campus["id"];

export type CourseSummary = {
  id: string;
  campusId: CampusId;
  campusName: string;
  /** 카드 머리글. 레거시는 모든 카드가 `문해와 사유` (EV-0006) */
  sectionTitle: string;
  /** 학년 묶음 제목. 예: `초등학교 4학년` */
  gradeTitle: string;
  title: string;
  scheduleText: string;
  startDateText: string;
  intakeOpen: boolean;
};

export type EventSummary = {
  id: string;
  campusId: CampusId;
  campusName: string;
  /** 설명회 목록의 장소 표기 (EV-0005) */
  venueName: string;
  title: string;
  startsAtText: string;
  /** 관리자가 직접 바꾸는 상태 이름 (ASM-001) */
  statusLabel: string;
  isClosed: boolean;
};

export type NoticeSummary = {
  id: string;
  /** 목록 번호 자리에 `공지`로 표시할지 여부 (EV-0007) */
  pinned: boolean;
  listNumber: number;
  title: string;
  author: string;
  dateText: string;
};

export type NoticeDetail = NoticeSummary & {
  /** 레거시 본문은 관찰하지 않았다. 관리자 공지 데이터로 대체한다. (ASM-015) */
  bodyParagraphs: readonly string[];
};

export type InstructorProfile = {
  id: string;
  name: string;
  /** 카드 머리글. 예: `문해와 사유 원장` */
  affiliation: string;
  careers: readonly string[];
};

/* ------------------------------------------------------------------ */
/* 콘텐츠 읽기                                                         */
/* ------------------------------------------------------------------ */

/**
 * STUB: `src/server/services/courses` 의 시간표 조회(GET)로 교체.
 * 값 출처: docs/evidence/dom/phase1-course.yml(대치본원), phase1-schedule-g.yml(분당점).
 * 레거시 대치 4학년 주중반 개강일 표기는 `11월 17월(화)` 오타였으므로 `11월 17일(화)`로 적는다.
 */
const COURSE_STUBS: readonly CourseSummary[] = [
  {
    id: "stub-course-daechi-g4-weekday",
    campusId: "daechi",
    campusName: "대치본원",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 4학년",
    title: "4학년 독해/논리반(주중반) 4회",
    scheduleText: "화,수,목,금 15/18시",
    startDateText: "11월 17일(화)",
    intakeOpen: true,
  },
  {
    id: "stub-course-daechi-g4-weekend",
    campusId: "daechi",
    campusName: "대치본원",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 4학년",
    title: "4학년 독해/논리반(주말반) 4회",
    scheduleText: "토,일 10/14/18시",
    startDateText: "11월 21일(토)",
    intakeOpen: true,
  },
  {
    id: "stub-course-daechi-g5-weekday",
    campusId: "daechi",
    campusName: "대치본원",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 5학년",
    title: "5학년 독해/논리반(주중반) 4회",
    scheduleText: "화,수,목,금 15/18시",
    startDateText: "11월 17일(화)",
    intakeOpen: true,
  },
  {
    id: "stub-course-daechi-g5-weekend",
    campusId: "daechi",
    campusName: "대치본원",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 5학년",
    title: "5학년 독해/논리반(주말반) 4회",
    scheduleText: "토,일 10/14/18시",
    startDateText: "11월 21일(토)",
    intakeOpen: true,
  },
  {
    id: "stub-course-daechi-g6-weekday",
    campusId: "daechi",
    campusName: "대치본원",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 6학년",
    title: "6학년 독해/논리반(주중반) 4회",
    scheduleText: "화,수,목,금 15/18시",
    startDateText: "11월 17일(화)",
    intakeOpen: true,
  },
  {
    id: "stub-course-daechi-g6-weekend",
    campusId: "daechi",
    campusName: "대치본원",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 6학년",
    title: "6학년 독해/논리반(주말반) 4회",
    scheduleText: "토,일 10/14/18시",
    startDateText: "11월 21일(토)",
    intakeOpen: false,
  },
  {
    id: "stub-course-bundang-g4-weekday",
    campusId: "bundang",
    campusName: "분당점",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 4학년",
    title: "4학년 독해/논리반(주중반) 4회",
    scheduleText: "화,수,목,금 15/18시",
    startDateText: "11월 17일(화)",
    intakeOpen: true,
  },
  {
    id: "stub-course-bundang-g4-weekend",
    campusId: "bundang",
    campusName: "분당점",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 4학년",
    title: "4학년 독해/논리반(주말반) 4회",
    scheduleText: "토,일 10/14/18시",
    startDateText: "11월 14일(토)",
    intakeOpen: true,
  },
  {
    id: "stub-course-bundang-g5-weekday",
    campusId: "bundang",
    campusName: "분당점",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 5학년",
    title: "5학년 독해/논리반(주중반) 4회",
    scheduleText: "화,수,목,금 15/18시",
    startDateText: "11월 17일(화)",
    intakeOpen: true,
  },
  {
    id: "stub-course-bundang-g5-weekend",
    campusId: "bundang",
    campusName: "분당점",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 5학년",
    title: "5학년 독해/논리반(주말반) 4회",
    scheduleText: "토,일 10/14/18시",
    startDateText: "11월 14일(토)",
    intakeOpen: true,
  },
  {
    id: "stub-course-bundang-g6-weekday",
    campusId: "bundang",
    campusName: "분당점",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 6학년",
    title: "6학년 독해/논리반(주중반) 4회",
    scheduleText: "화,수,목,금 15/18시",
    startDateText: "11월 17일(화)",
    intakeOpen: true,
  },
  {
    id: "stub-course-bundang-g6-weekend",
    campusId: "bundang",
    campusName: "분당점",
    sectionTitle: "문해와 사유",
    gradeTitle: "초등학교 6학년",
    title: "6학년 독해/논리반(주말반) 4회",
    scheduleText: "토,일 10/14/18시",
    startDateText: "11월 14일(토)",
    intakeOpen: true,
  },
];

/** STUB: `GET /api/courses?campus=` (BE 시간표 서비스)로 교체. */
export function listCoursesByCampusStub(campusId: CampusId): CourseSummary[] {
  return COURSE_STUBS.filter((course) => course.campusId === campusId);
}

/** 학년 묶음 순서를 유지한 채 그룹으로 나눈다. */
export function groupCoursesByGrade(
  courses: readonly CourseSummary[],
): { gradeTitle: string; courses: CourseSummary[] }[] {
  const groups: { gradeTitle: string; courses: CourseSummary[] }[] = [];

  for (const course of courses) {
    const existing = groups.find((group) => group.gradeTitle === course.gradeTitle);
    if (existing) {
      existing.courses.push(course);
    } else {
      groups.push({ gradeTitle: course.gradeTitle, courses: [course] });
    }
  }

  return groups;
}

/**
 * STUB: `src/server/services/events` 의 공개 설명회 목록 조회로 교체.
 * 마감된 항목은 docs/evidence/dom/phase1-presentation.yml 관찰값이다.
 * `접수중`·`마감임박` 항목은 레거시 관찰 시점에 접수 가능한 일정이 없어 임시로 넣은 값이다. // ASM-045
 */
const EVENT_STUBS: readonly EventSummary[] = [
  {
    id: "stub-event-daechi-winter-1",
    campusId: "daechi",
    campusName: "대치본원",
    venueName: "문사유 대치점",
    title: "문해와 사유 대치본원 겨울 학부모 설명회 1차",
    startsAtText: "2026년 12월 5일 (토) 11:00",
    statusLabel: "접수중",
    isClosed: false,
  },
  {
    id: "stub-event-daechi-winter-2",
    campusId: "daechi",
    campusName: "대치본원",
    venueName: "문사유 대치점",
    title: "문해와 사유 대치본원 겨울 학부모 설명회 2차",
    startsAtText: "2026년 12월 5일 (토) 14:00",
    statusLabel: "마감임박",
    isClosed: false,
  },
  {
    id: "stub-event-daechi-add-4",
    campusId: "daechi",
    campusName: "대치본원",
    venueName: "문사유 대치점",
    title: "추가설명회 문해와 사유 대치점 개원 기념 학부모 설명회 4차★마감★",
    startsAtText: "2026년 11월 14일(토) 14:00",
    statusLabel: "접수마감",
    isClosed: true,
  },
  {
    id: "stub-event-daechi-add-5",
    campusId: "daechi",
    campusName: "대치본원",
    venueName: "문사유 대치점",
    title: "추가설명회 문해와 사유 대치점 개원 기념 학부모 설명회 5차★마감★",
    startsAtText: "2026년 11월 14일(토) 17:00",
    statusLabel: "접수마감",
    isClosed: true,
  },
  {
    id: "stub-event-daechi-open-3",
    campusId: "daechi",
    campusName: "대치본원",
    venueName: "문사유 대치점",
    title: "문해와 사유 대치본원 개원 기념 학부모 설명회 3차★마감★",
    startsAtText: "2026년 11월 6일 (금) 19:00",
    statusLabel: "접수마감",
    isClosed: true,
  },
  {
    id: "stub-event-daechi-open-2",
    campusId: "daechi",
    campusName: "대치본원",
    venueName: "문사유 대치점",
    title: "문해와 사유 대치본원 개원 기념 학부모 설명회 2차★마감★",
    startsAtText: "2026년 11월 6일 (금) 14:00",
    statusLabel: "접수마감",
    isClosed: true,
  },
  {
    id: "stub-event-daechi-open-1",
    campusId: "daechi",
    campusName: "대치본원",
    venueName: "문사유 대치점",
    title: "문해와 사유 대치본원 개원 기념 학부모 설명회 1차 ★마감★",
    startsAtText: "2026년 11월 5일 (목) 11:00",
    statusLabel: "접수마감",
    isClosed: true,
  },
  {
    id: "stub-event-bundang-winter-1",
    campusId: "bundang",
    campusName: "분당점",
    venueName: "문사유 분당점",
    title: "문해와 사유 분당점 겨울 학부모 설명회 1차",
    startsAtText: "2026년 12월 6일 (일) 11:00",
    statusLabel: "접수중",
    isClosed: false,
  },
  {
    id: "stub-event-bundang-add-4",
    campusId: "bundang",
    campusName: "분당점",
    venueName: "문사유 분당점",
    title: "추가설명회 문해와 사유 분당점 개원 기념 학부모 설명회 4차★마감★",
    startsAtText: "2026년 11월 14일 (토) 11:00",
    statusLabel: "접수마감",
    isClosed: true,
  },
  {
    id: "stub-event-bundang-add-5",
    campusId: "bundang",
    campusName: "분당점",
    venueName: "문사유 분당점",
    title: "추가설명회 문해와 사유 분당점 개원 기념 학부모 설명회 5차★마감★",
    startsAtText: "2026년 11월 15일 (일) 17:00",
    statusLabel: "접수마감",
    isClosed: true,
  },
  {
    id: "stub-event-bundang-open-3",
    campusId: "bundang",
    campusName: "분당점",
    venueName: "문사유 분당점",
    title: "문해와 사유 분당점 개원 기념 학부모 설명회 3차★마감★",
    startsAtText: "2026년 11월 4일 (수) 19:00",
    statusLabel: "접수마감",
    isClosed: true,
  },
  {
    id: "stub-event-bundang-open-2",
    campusId: "bundang",
    campusName: "분당점",
    venueName: "문사유 분당점",
    title: "문해와 사유 분당점 개원 기념 학부모 설명회 2차★마감★",
    startsAtText: "2026년 11월 4일 (수) 14:00",
    statusLabel: "접수마감",
    isClosed: true,
  },
  {
    id: "stub-event-bundang-open-1",
    campusId: "bundang",
    campusName: "분당점",
    venueName: "문사유 분당점",
    title: "문해와 사유 분당점 개원 기념 학부모 설명회 1차★마감★",
    startsAtText: "2026년 11월 4일 (수) 11:00",
    statusLabel: "접수마감",
    isClosed: true,
  },
];

/** STUB: `GET /api/events` (BE 설명회 공개 목록)로 교체. */
export function listEventsByCampusStub(campusId: CampusId): EventSummary[] {
  return EVENT_STUBS.filter((event) => event.campusId === campusId);
}

/**
 * STUB: `src/server/services/content` 의 공지 조회로 교체. (ASM-015)
 * 목록 값은 docs/evidence/dom/phase1-notice.yml 관찰값이고 본문은 미관찰이다.
 */
const NOTICE_STUBS: readonly NoticeDetail[] = [
  {
    id: "2",
    pinned: true,
    listNumber: 2,
    title: "추가 설명회 긴급 편성(전타임 마감)",
    author: "문사유",
    dateText: "11-03",
    bodyParagraphs: [
      "공지 본문은 레거시 공개 화면에서 관찰하지 않았습니다.",
      "관리자 공지 데이터가 연결되면 이 자리에 본문이 표시됩니다.",
    ],
  },
  {
    id: "1",
    pinned: false,
    listNumber: 1,
    title: "문해와 사유 개원 기념 학부모 설명회 안내",
    author: "문사유",
    dateText: "10-29",
    bodyParagraphs: [
      "공지 본문은 레거시 공개 화면에서 관찰하지 않았습니다.",
      "관리자 공지 데이터가 연결되면 이 자리에 본문이 표시됩니다.",
    ],
  },
];

/** STUB: `GET /api/notices` 로 교체. */
export function listNoticesStub(): NoticeSummary[] {
  return NOTICE_STUBS.map((notice) => ({
    id: notice.id,
    pinned: notice.pinned,
    listNumber: notice.listNumber,
    title: notice.title,
    author: notice.author,
    dateText: notice.dateText,
  }));
}

/** STUB: `GET /api/notices/{id}` 로 교체. */
export function findNoticeStub(id: string): NoticeDetail | undefined {
  return NOTICE_STUBS.find((notice) => notice.id === id);
}

/** STUB: `GET /api/notices` 의 전체 건수로 교체. */
export function countNoticesStub(): number {
  return NOTICE_STUBS.length;
}

/**
 * STUB: `src/server/services/instructors` 의 공개 강사 목록으로 교체. (AD-006)
 * 값 출처: docs/evidence/dom/phase1-teachers.yml (EV-0009).
 * 사진은 원본 파일을 확보하지 못해 넣지 않는다. // ASM-042
 */
const INSTRUCTOR_STUBS: readonly InstructorProfile[] = [
  {
    id: "stub-instructor-kimyunhwan",
    name: "김윤환 원장",
    affiliation: "문해와 사유 원장",
    careers: [
      "연세대 행정학과 졸업(논술특기자 입학)",
      "현) 문해와 사유 대치/분당학원 원장",
      "현) 시대인재 단과/재종 인문논술 강사",
      "현) 카이로스논구술 인문논술 대표강사",
      "현) 논술런(인강), 김윤환입시컨설팅 대표",
      "전) 논단기/스카이에듀 논구술 강사",
      "전) 아토즈논구술아카데미 원장",
    ],
  },
  {
    id: "stub-instructor-kimminju",
    name: "김민주 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "서울대학교 서어서문학과 졸업, 국어국문학과 부전공",
      "현) 김윤환논술 첨삭강사(대치 시대인재/대치 카이로스논술)",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
    ],
  },
  {
    id: "stub-instructor-kimbomin",
    name: "김보민 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "성균관대 대학원 디지털헬스학과",
      "현) 김윤환논술 연구강사(대치 시대인재/대치 카이로스논술)",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
    ],
  },
  {
    id: "stub-instructor-kimsehyeon",
    name: "김세현 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "서울대학교 윤리교육과 석사과정",
      "중등학교 정교사 2급(도덕윤리)",
      "현) 김윤환논술 첨삭강사(대치 시대인재/대치 카이로스논술)",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
    ],
  },
  {
    id: "stub-instructor-kimjimin",
    name: "김지민 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "인천대 윤리교육과 우등졸업",
      "중등학교 정교사 2급(도덕윤리)",
      "현) 김윤환논술 첨삭강사(대치 시대인재/대치 카이로스논술)",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
    ],
  },
  {
    id: "stub-instructor-parkseonmi",
    name: "박선미 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "동국대 법학과 졸업",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
      "현) 김윤환논술 연구강사(대치 시대인재/대치 카이로스논술)",
      "전) 국어와 논술을 말하다 강사",
    ],
  },
  {
    id: "stub-instructor-sinseojin",
    name: "신서진 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "고려대 국어교육학과 졸업",
      "현) 김윤환논술 첨삭강사(대치 시대인재/대치 카이로스논술)",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
    ],
  },
  {
    id: "stub-instructor-yuhyeon",
    name: "유 현 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "고려대 교육대학원 도덕윤리교육 석사 졸업",
      "중등학교 정교사 2급 (도덕윤리)",
      "논술교육 자격증 보유",
      "현) 김윤환논술 첨삭강사(대치 시대인재/대치 카이로스논술)",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
    ],
  },
  {
    id: "stub-instructor-wondahyeon",
    name: "원다현 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "서울교육대학교 정보교육과",
      "현) 김윤환논술 연구강사(대치시대인재/대치카이로스논술)",
      "현) 문해와 사유 코스모프로젝트 연구팀장",
      "현) 문해와 사유 강사",
    ],
  },
  {
    id: "stub-instructor-jeonggeonu",
    name: "정건우 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "서울교육대학교 정보교육과",
      "현) 김윤환논술 연구강사(대치시대인재/대치카이로스논술)",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
    ],
  },
  {
    id: "stub-instructor-choeeunji",
    name: "최은지 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "한국외대 일본어과 졸업",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
      "전) 한국경제TV 아나운서",
    ],
  },
  {
    id: "stub-instructor-choejina",
    name: "최지나 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "고려대학교 영어영문학과 졸업",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
      "전) 리뉴어학원 특목고,외고 대비반 담임",
      "전) 지원어학원 부원장",
      "전) 핀포인트입시 의,약대전문반 담임",
      "전) 중앙고등학교, 숭문고등학교 수능특강 외부강사 4년",
    ],
  },
  {
    id: "stub-instructor-seokhyeseon",
    name: "석혜선 선생님",
    affiliation: "문해와 사유 강사",
    careers: [
      "이화여대 대학원 국문과 졸업(석사)",
      "현) 문해와 사유 코스모프로젝트 선임연구원",
      "현) 문해와 사유 강사",
      "전) 기파랑문해원 강사 (대치)",
    ],
  },
];

/** STUB: `GET /api/instructors` 로 교체. */
export function listInstructorsStub(): readonly InstructorProfile[] {
  return INSTRUCTOR_STUBS;
}

/**
 * 분당점 강사진 화면(`/sub/abouttch2`)에서 쓰는 목록.
 * docs/legacy/legacy-instructors.json 의 `team` 값이 분당을 포함하는 강사만 추린다. // ASM-043
 * STUB: `GET /api/instructors?team=bundang` 로 교체.
 */
export function listBundangInstructorsStub(): readonly InstructorProfile[] {
  return INSTRUCTOR_STUBS.filter((instructor) =>
    instructor.careers.some((career) => career.includes("분당")),
  );
}

/* ------------------------------------------------------------------ */
/* 세션                                                                */
/* ------------------------------------------------------------------ */

/**
 * STUB: `src/server/auth` 의 세션 조회로 교체.
 * 실제 개인정보를 쓰지 않도록 누가 봐도 가짜인 값만 담는다.
 */
export function getSessionUserStub(): SessionUser {
  return {
    id: "stub-user-0001",
    loginId: "stub_member",
    name: "스텁 회원",
    role: "MEMBER",
  };
}

/* ------------------------------------------------------------------ */
/* 쓰기 (브라우저 이벤트 핸들러에서만 호출한다)                         */
/* ------------------------------------------------------------------ */

function nowIso(): string {
  return new Date().toISOString();
}

/** STUB: `POST /api/course-applications` 로 교체. (FM-001) */
export async function submitCourseApplicationStub(
  input: CourseApplicationInput,
): Promise<ApplicationCreatedResult> {
  return {
    id: `stub-course-application-${input.courseId}`,
    replayed: false,
    createdAt: nowIso(),
  };
}

/** STUB: `POST /api/event-reservations` 로 교체. (FM-002) */
export async function submitEventReservationStub(
  input: EventReservationInput,
): Promise<ApplicationCreatedResult> {
  return {
    id: `stub-event-reservation-${input.eventId}`,
    replayed: false,
    createdAt: nowIso(),
  };
}

/**
 * STUB: `POST /api/reservations/lookup` 으로 교체. (PG-011)
 * 한 연락처에 강좌 신청과 설명회 예약이 함께 나올 수 있다. (ASM-013)
 * 조회 결과가 없으면 빈 배열을 돌려주고 화면은 존재 여부를 알리지 않는 문구만 보여 준다.
 */
export async function lookupReservationsStub(
  input: ReservationLookupInput,
): Promise<ReservationLookupResult> {
  void input;

  return {
    items: [
      {
        kind: "course",
        reservationId: "stub-reservation-course-1",
        status: "PENDING",
        title: "5학년 독해/논리반(주중반) 4회",
        campusName: "대치본원",
        scheduledAt: null,
        scheduleText: "화,수,목,금 15/18시",
        attendeeCount: null,
        appliedAt: "2026-11-10T09:12:00.000Z",
        cancellable: true,
      },
      {
        kind: "event",
        reservationId: "stub-reservation-event-1",
        status: "CONFIRMED",
        title: "문해와 사유 대치본원 겨울 학부모 설명회 1차",
        campusName: "대치본원",
        scheduledAt: "2026-12-05T02:00:00.000Z",
        scheduleText: null,
        attendeeCount: 2,
        appliedAt: "2026-11-11T01:30:00.000Z",
        cancellable: true,
      },
    ],
  };
}

/** STUB: `POST /api/reservations/{id}/cancel` 로 교체. (PG-011) */
export async function cancelReservationStub(
  input: ReservationCancelInput,
): Promise<{ reservationId: string }> {
  return { reservationId: input.reservationId };
}

/** STUB: `POST /api/auth/register` 로 교체. (FM-003) */
export async function registerMemberStub(): Promise<void> {}

/** STUB: `POST /api/auth/login` 으로 교체. (FM-003) */
export async function loginStub(): Promise<SessionUser> {
  return getSessionUserStub();
}

/** STUB: `POST /api/auth/find-login-id` 로 교체. (FM-003) */
export async function findLoginIdStub(): Promise<void> {}

/** STUB: `POST /api/auth/password-reset/request` 로 교체. (FM-003) */
export async function requestPasswordResetStub(): Promise<void> {}

/** STUB: `POST /api/auth/password-reset/confirm` 으로 교체. (FM-003) */
export async function resetPasswordStub(): Promise<void> {}

/** STUB: `PATCH /api/account/profile` 로 교체. (FM-003) */
export async function updateProfileStub(): Promise<void> {}

/** STUB: `POST /api/account/password` 로 교체. (FM-003) */
export async function changePasswordStub(): Promise<void> {}

/** STUB: `POST /api/account/withdraw` 로 교체. (FM-003) */
export async function withdrawStub(): Promise<void> {}

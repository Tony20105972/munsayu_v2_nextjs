/**
 * 레거시 공개 레이아웃(헤더 상단 바·주 메뉴·푸터)에서 관찰한 값만 모은다.
 * 근거: docs/evidence/dom/phase1-home.yml, phase1-about.yml, phase1-course.yml (EV-0003, EV-0007)
 * 사이트에 법적으로 공개된 사업자 정보는 CLAUDE.md 5장 예외에 따라 그대로 싣는다.
 */

export const SITE_NAME = "문해와 사유";
export const SITE_TITLE_SUFFIX = "문해와 사유(초등독서논술학원)";
export const SITE_ORIGIN = "https://munsayu.com";

/** 상단 바 문구 (phase1-home.yml 상단 바) */
export const CONSULT_CENTER_LINE = "상담센터 : (대치)02-563-5972 / (분당)031-713-5972";

/** 푸터 소개 문구 (phase1-home.yml contentinfo) */
export const FOOTER_TAGLINE_LINES = [
  "읽고, 생각하고, 자기 언어로 표현합니다.",
  "어휘·독해·사고·토론·글쓰기를 연결하는 초등 고학년 문해력 교육",
] as const;

export const FOOTER_COUNSEL_HOURS = "상담시간: 월-금 13:00-21:00 / 토·일 9:30-21:00";

/** 홈 상담 섹션에서 관찰한 상담 가능 시간 (phase1-home.yml) */
export const HOME_COUNSEL_HOURS =
  "상담 가능시간 : 월-금 14:00-22:00 / 토·일 08:30-22:00";

export type Campus = {
  id: "daechi" | "bundang";
  /** 레거시 표기 그대로 */
  name: string;
  /** 설명회 목록에서 쓰는 표기 (phase1-presentation.yml) */
  venueName: string;
  phone: string;
  /** 숫자만 남긴 tel: 링크 값 */
  telHref: string;
  address: string;
  timetablePath: "/sub/schedule.n" | "/sub/schedule.g";
};

export const CAMPUSES: readonly Campus[] = [
  {
    id: "daechi",
    name: "대치본원",
    venueName: "문사유 대치점",
    phone: "02-563-5972",
    telHref: "tel:02-563-5972",
    address: "서울시 강남구 대치동 987-14(도곡로515) 2층",
    timetablePath: "/sub/schedule.n",
  },
  {
    id: "bundang",
    name: "분당점",
    venueName: "문사유 분당점",
    phone: "031-713-5972",
    telHref: "tel:031-713-5972",
    address: "경기도 성남시 분당구 수내동 28-1 (내정로173번길1) 5층",
    timetablePath: "/sub/schedule.g",
  },
] as const;

/** 외부 링크. RT-003 문해력 진단 신청 주소는 그대로 유지한다. */
export const EXTERNAL_LINKS = {
  literacyDiagnosis: "https://forms.gle/XUjFY9jVStQDKskg8",
  kakaoChannel: "http://pf.kakao.com/_yZKWX/",
  instagram: "https://www.instagram.com/munsayu_official/",
  naverBlog: "https://blog.naver.com/munsayu",
} as const;

/**
 * 주 메뉴. 레거시는 `javascript:;` 드롭다운이라 하위 항목을 관찰할 수 없었다.
 * 메뉴 이름과 순서는 관찰값이고, 하위 항목은 관찰된 공개 경로로 채웠다. // ASM-040
 */
export const MAIN_NAV = [
  {
    label: "학원안내",
    items: [
      { label: "학원 소개", href: "/sub/about" },
      { label: "시설안내", href: "/sub/Facility" },
      { label: "오시는 길", href: "/sub/Location" },
    ],
  },
  {
    label: "강사진안내",
    items: [
      { label: "강사진 안내", href: "/sub/abouttch1" },
      { label: "분당점 강사진", href: "/sub/abouttch2" },
      { label: "문해력 진단 안내", href: "/sub/abouttch3" },
    ],
  },
  {
    label: "시간표",
    items: [
      { label: "대치본원", href: "/sub/schedule.n" },
      { label: "분당점", href: "/sub/schedule.g" },
    ],
  },
  {
    label: "설명회",
    items: [
      { label: "설명회 예약", href: "/sub/Presentation" },
      { label: "공지사항", href: "/notice" },
    ],
  },
  {
    label: "예약확인/신청",
    items: [
      { label: "예약 확인 / 취소", href: "/sub/Check" },
      { label: "대치본원 수강 예약", href: "/sub/schedule.n" },
    ],
  },
] as const;

/** 푸터 링크 묶음. 레거시 관찰값 그대로의 제목·순서·주소를 쓴다. */
export const FOOTER_COLUMNS = [
  {
    heading: "ABOUT",
    links: [
      { label: "학원 소개", href: "/sub/about" },
      { label: "교육 철학", href: "/sub/about" },
      { label: "강사진", href: "/sub/abouttch1" },
      { label: "오시는 길", href: "/sub/Location" },
    ],
  },
  {
    heading: "PROGRAM",
    links: [
      { label: "대치본원", href: "/sub/schedule.n" },
      { label: "분당점", href: "/sub/schedule.g" },
    ],
  },
] as const;

export const BUSINESS_INFO = {
  representative: "대표 : 유시내 | 개인정보관리책임자 : 오동준팀장(edunonsul@daum.net)",
  registration: "사업자번호 : 385-86-03969 | 학원운영등록증번호: 제15526호",
  copyright: "© 2026 MUNSAYU.COM ELEMENTARY LITERACY. All Rights Reserved.",
} as const;

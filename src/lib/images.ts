/**
 * 레거시에서 받아 둔 공개 이미지의 단일 등록부.
 *
 * - 파일은 `public/images/` 아래에 커밋돼 있다. 외부 호스트를 직접 가리키지 않는다.
 * - `alt` 는 레거시 원문 그대로다. 근거: `docs/evidence/assets/legacy-image-map.md` (EV-0012)
 * - 권리: 학원 귀속으로 확정(D6). `photo-*` 형식과 홈 배경 3장은 Unsplash 추정이며
 *   `docs/legacy/legacy-assets.json` 에 그렇게 기록돼 있다.
 */

export type ImageAsset = {
  src: string;
  /** 레거시 원문 alt. 장식용이면 빈 문자열이다. */
  alt: string;
};

/** 공통 헤더 로고. 레거시 `seo/logo_munsau.png`. */
export const LOGO_IMAGE = {
  src: "/images/brand/logo-munsayu.png",
  alt: "문사유 아카데미 로고",
  width: 800,
  height: 172,
} as const;

/**
 * `/sub/*` 공통 상단 배경. 레거시도 CSS background 였다.
 * (`img/photo-1541339907198-e08756dedf3f.avif`)
 */
export const SUB_HERO_BACKGROUND = "/images/hero/sub-hero.avif";

/** 홈 상단 배경 3장. 레거시는 CSS background 로 돌아가는 슬라이드였다. */
export const HOME_HERO_BACKGROUNDS = [
  "/images/hero/home-slide-1.jpeg",
  "/images/hero/home-slide-2.avif",
  "/images/hero/home-slide-3.jpeg",
] as const;

/**
 * `/sub/Facility` 학원 사진 8장. 레거시는 지점 탭마다 4장씩 슬라이드로 돌렸다.
 * `alt` 는 레거시처럼 빈 문자열이다(장식용). (EV-0012)
 */
export const FACILITY_SLIDE_PHOTOS: Record<string, readonly ImageAsset[]> = {
  daechi: [
    { src: "/images/facility/facility-01.jpg", alt: "" },
    { src: "/images/facility/facility-02.jpg", alt: "" },
    { src: "/images/facility/facility-03.jpg", alt: "" },
    { src: "/images/facility/facility-04.jpg", alt: "" },
  ],
  bundang: [
    { src: "/images/facility/facility-05.jpg", alt: "" },
    { src: "/images/facility/facility-06.jpg", alt: "" },
    { src: "/images/facility/facility-07.jpg", alt: "" },
    { src: "/images/facility/facility-08.jpg", alt: "" },
  ],
};

/**
 * `/sub/Facility` 공간 카드 사진. 레거시가 `images.unsplash.com` 을 핫링크하던 자리이고
 * 지금은 같은 사진을 내려받아 `public/images/facility/stock-*.jpg` 로 커밋해 두었다.
 * 레거시가 두 자리에서 같은 파일을 재사용한 것도 그대로 따른다. (EV-0012)
 *
 * `책과 글을 위한 교실` 칸은 원본이 Unsplash 에서 404 라 받지 못했다. 레거시 운영
 * 사이트에서도 이 칸이 깨져 있다. 사진 대신 CSS 처리로 둔다(`null`). // ASM-079
 */
export const FACILITY_FEATURE_PHOTOS: Record<string, ImageAsset | null> = {
  "절제된 색감과 따뜻한 소재": {
    src: "/images/facility/stock-01.jpg",
    alt: "절제된 색감과 따뜻한 소재",
  },
  "시야가 이어지는 공간": {
    src: "/images/facility/stock-02.jpg",
    alt: "시야가 이어지는 공간",
  },
  "책과 글을 위한 교실": null,
  "역할이 분명한 동선": {
    src: "/images/facility/stock-03.jpg",
    alt: "역할이 분명한 동선",
  },
  "책과 가까워지는 북카페": {
    src: "/images/facility/stock-04.jpg",
    alt: "책과 가까워지는 북카페",
  },
  "편안하게 머무는 독서 자리": {
    src: "/images/facility/stock-02.jpg",
    alt: "편안하게 머무는 독서 자리",
  },
  "아이의 움직임까지 세심하게": {
    src: "/images/facility/stock-05.jpg",
    alt: "아이의 움직임까지 세심하게",
  },
  "머무는 시간 내내 쾌적하게": {
    src: "/images/facility/stock-03.jpg",
    alt: "머무는 시간 내내 쾌적하게",
  },
};

/** `/sub/about` 1번 탭의 사진. 레거시 Unsplash 사진을 내려받아 커밋해 두었다. (EV-0012) */
export const ABOUT_INTRO_PHOTO: ImageAsset = {
  src: "/images/about/class-scene.jpg",
  alt: "문사유 수업현장",
};

/**
 * 강사 사진 등록부.
 *
 * 키는 레거시 강사 식별용 이름이고, 값은 커밋된 파일 경로다. 관리자가 보관함에서
 * 사진을 지정하기 전까지 이 등록부가 기본 사진을 대신한다. (AD-015)
 * 레거시는 같은 사진을 `/sub/abouttch1`·`/sub/abouttch2` 에 다른 이름으로 중복
 * 업로드해 두었는데, 신규에서는 **한 파일을 두 화면이 함께 쓴다**.
 */
export const INSTRUCTOR_PHOTOS: Record<string, string> = {
  "kim-yoonhwan": "/images/instructors/kim-yoonhwan.jpg",
  "kim-minju": "/images/instructors/kim-minju.jpg",
  "kim-bomin": "/images/instructors/kim-bomin.jpg",
  "kim-sehyun": "/images/instructors/kim-sehyun.jpg",
  "kim-jimin": "/images/instructors/kim-jimin.jpg",
  "park-sunmi": "/images/instructors/park-sunmi.jpg",
  "shin-seojin": "/images/instructors/shin-seojin.jpg",
  "yoo-hyun": "/images/instructors/yoo-hyun.jpg",
  "won-dahyun": "/images/instructors/won-dahyun.jpg",
  "jung-geonwoo": "/images/instructors/jung-geonwoo.jpg",
  "choi-eunji": "/images/instructors/choi-eunji.jpg",
  "choi-jina": "/images/instructors/choi-jina.jpg",
  "seok-hyeseon": "/images/instructors/seok-hyeseon.jpg",
  "munsayu-class": "/images/instructors/munsayu-class.jpg",
};

/**
 * 레거시 강사 이름 → 사진 키.
 * DB 의 `photoMediaId` 가 비어 있어도 레거시 명단과 이름이 같으면 사진이 붙는다.
 */
export const INSTRUCTOR_PHOTO_KEY_BY_NAME: Record<string, string> = {
  "김윤환 원장": "kim-yoonhwan",
  "김민주 선생님": "kim-minju",
  "김보민 선생님": "kim-bomin",
  "김세현 선생님": "kim-sehyun",
  "김지민 선생님": "kim-jimin",
  "박선미 선생님": "park-sunmi",
  "신서진 선생님": "shin-seojin",
  "유 현 선생님": "yoo-hyun",
  "원다현 선생님": "won-dahyun",
  "정건우 선생님": "jung-geonwoo",
  "최은지 선생님": "choi-eunji",
  "최지나 선생님": "choi-jina",
  "석혜선 선생님": "seok-hyeseon",
  "문해와 사유": "munsayu-class",
};

/**
 * 사진이 지정되지 않은 강사의 자리표시.
 * 레거시도 사진이 없는 강사 자리에 이 로고 이미지를 넣어 두었다
 * (`석혜선 선생님 사진` 과 `문해와 사유 사진` 이 바이트 단위로 같은 파일이다). // ASM-080
 */
export const INSTRUCTOR_PHOTO_FALLBACK = "/images/instructors/munsayu-class.jpg";

/**
 * 강사 1명의 사진을 고른다.
 *
 * 순서: 관리자가 보관함에서 지정한 사진 → 레거시 이름 매핑 → 자리표시 로고.
 * 보관함이 비어 있어도(DB 를 막 만든 상태) 레거시 매핑으로 사진이 붙는다. (AD-015 복원력)
 */
export function resolveInstructorPhoto(instructor: {
  name: string;
  /** AD-015 보관함에서 지정한 사진. 지정하지 않았으면 `null`. */
  photo: { url: string; alt: string } | null;
}): ImageAsset {
  if (instructor.photo) {
    return { src: instructor.photo.url, alt: instructor.photo.alt };
  }

  const legacyKey = INSTRUCTOR_PHOTO_KEY_BY_NAME[instructor.name];
  return {
    src: legacyKey ? INSTRUCTOR_PHOTOS[legacyKey] : INSTRUCTOR_PHOTO_FALLBACK,
    alt: `${instructor.name} 사진`,
  };
}

/* ------------------------------------------------------------------ *
 * AD-015 기본값 — DB 를 읽지 못하거나 아직 비어 있을 때 쓰는 화면 기본 내용.
 * 관리자가 저장한 값이 있으면 그 값이 이깁니다.
 * ------------------------------------------------------------------ */

/** 메인 배너 슬라이드 1장의 화면용 모양. DB 행과 코드 기본값이 같은 모양을 쓴다. */
export type HomeBannerView = {
  id: string;
  /** 배경 사진 주소. 없으면 화면이 단색 배경으로 그린다. */
  backgroundUrl: string | null;
  eyebrow: string;
  headline: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

/**
 * 관리자가 배너를 하나도 만들지 않았을 때 쓰는 기본 3장.
 *
 * 레거시 홈 배너는 **슬라이드마다 문구·버튼이 다르다.** Phase 3 에서는 1번 슬라이드
 * 문구를 3장에 그대로 복사해 2·3번 문구가 사라져 있었다. Phase 5 동등성 검증에서
 * 레거시 HTML 을 다시 읽어 세 장을 각각 복원했다. (EV-0015)
 *
 * 2·3번 슬라이드에는 레거시에도 버튼이 하나뿐이라 보조 버튼을 비워 둔다.
 */
export const DEFAULT_HOME_BANNERS: readonly HomeBannerView[] = [
  {
    id: "default-1",
    backgroundUrl: HOME_HERO_BACKGROUNDS[0],
    eyebrow: "ELEMENTARY LITERACY PROGRAM",
    headline: "읽은 것을 이해하고,\n자기 생각으로 표현하는 힘",
    body: "어휘·독해·사고 토론·글쓰기를 하나의 흐름으로 연결합니다.\n읽은 내용을 바탕으로 생각을 나누고, 근거를 갖춘 글로 정리합니다.",
    primaryLabel: "문해력 진단 신청",
    // 레거시는 구글 폼으로 바로 나갔다. 신규는 진단 안내 화면을 거쳐 관리자가 설정한
    // 폼으로 보낸다(ASM-082). 레거시 홈 버튼의 폼 주소가 `/sub/abouttch3` 의 주소와
    // 달라 원장님 확인이 필요하다. (open-questions Q-ADM-15)
    primaryHref: "/sub/abouttch3",
    secondaryLabel: "교육과정 알아보기",
    secondaryHref: "/sub/schedule.n",
  },
  {
    id: "default-2",
    backgroundUrl: HOME_HERO_BACKGROUNDS[1],
    eyebrow: "EXPERT TEACHERS & CURRICULUM",
    headline: "아이의 생각을 듣고,\n다음 질문을 이끄는 강사진",
    body: "어디까지 이해했는지, 어떤 근거로 판단했는지 함께 살핍니다.\n질문과 피드백으로 아이가 스스로 설명하고 고쳐 쓰도록 돕습니다.",
    primaryLabel: "강사진·교육 철학 보기",
    primaryHref: "/sub/abouttch1",
    secondaryLabel: "",
    secondaryHref: "",
  },
  {
    id: "default-3",
    backgroundUrl: HOME_HERO_BACKGROUNDS[2],
    eyebrow: "THINKING & WRITING CLINIC",
    headline: "질문으로 생각을 넓히고,\n토론과 글쓰기로 다듬습니다",
    body: "같은 글을 읽고 서로 다른 생각을 나눕니다. 근거를 들어 설명하고, 토론에서 다듬은 생각을 글로 정리합니다.\n작성한 글은 강사와 함께 읽으며 보완합니다.",
    primaryLabel: "토론·글쓰기 과정 보기",
    primaryHref: "/sub/about",
    secondaryLabel: "",
    secondaryHref: "",
  },
];

/** 시설안내 사진 1장의 화면용 모양. */
export type FacilityPhotoView = {
  id: string;
  url: string;
  /** 설명. 비어 있으면 장식용 사진으로 보고 빈 `alt` 로 그린다(레거시와 같다). */
  caption: string;
};

/**
 * 관리자가 시설 사진을 하나도 등록하지 않았을 때 쓰는 기본값.
 * 지금 커밋돼 있는 지점별 4장 그대로다. (EV-0012)
 */
export const DEFAULT_FACILITY_PHOTOS: Record<string, readonly FacilityPhotoView[]> =
  Object.fromEntries(
    Object.entries(FACILITY_SLIDE_PHOTOS).map(([campusKey, photos]) => [
      campusKey,
      photos.map((photo, index) => ({
        id: `default-${campusKey}-${index + 1}`,
        url: photo.src,
        caption: photo.alt,
      })),
    ]),
  );

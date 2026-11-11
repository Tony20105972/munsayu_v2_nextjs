import type { Page } from "@playwright/test";

/**
 * 시각 회귀·반응형 점검이 함께 쓰는 공개 화면 목록과 준비 함수.
 *
 * - 운영 사이트(munsayu.com)에는 접속하지 않는다. 모든 경로는 로컬 서버 기준 상대 경로다.
 * - 비교 기준 이미지는 `docs/evidence/screenshots/` 의 레거시 화면이고, 차이 분류는
 *   `docs/reports/phase-3-fe-notes.md` 에 적는다. 테스트가 쓰는 기준선은 Playwright가
 *   저장한 스냅샷(`*-snapshots/`)이다.
 */
export type PublicPageCase = {
  /** 기능 ID. 문서·보고서와 같은 값을 쓴다. */
  featureId: string;
  name: string;
  path: string;
  /**
   * 화면이 다 그려졌음을 알리는 텍스트.
   * PPR 로 본문이 나중에 흘러오는 화면은 이 텍스트가 보일 때까지 기다린 뒤 찍는다.
   */
  readyText: string;
};

/** seed 가 넣는 고정 공지 id. 날짜·내용이 고정이라 스냅샷이 흔들리지 않는다. */
export const SEED_NOTICE_ID = "seed-notice-01";

export const PUBLIC_PAGES: readonly PublicPageCase[] = [
  { featureId: "PG-001", name: "홈", path: "/", readyText: "PROJECT COSMO" },
  {
    featureId: "PG-002",
    name: "학원 소개",
    path: "/sub/about",
    readyText: "문해와 사유의 생각",
  },
  {
    featureId: "PG-003",
    name: "오시는 길",
    path: "/sub/Location",
    readyText: "오시는 길",
  },
  {
    featureId: "PG-004",
    name: "시설안내",
    path: "/sub/Facility",
    readyText: "시설안내",
  },
  {
    featureId: "PG-005",
    name: "강사진 안내",
    path: "/sub/abouttch1",
    readyText: "문사유 학원 대표강사 라인업",
  },
  {
    featureId: "PG-006",
    name: "분당점 강사진",
    path: "/sub/abouttch2",
    readyText: "전체 강사진 보기",
  },
  {
    featureId: "PG-007",
    name: "문해력 진단 안내",
    path: "/sub/abouttch3",
    readyText: "문해력 진단",
  },
  {
    featureId: "PG-008",
    name: "대치본원 시간표",
    path: "/sub/schedule.n",
    readyText: "예비초 문해력 기초반(주중반) 4회",
  },
  {
    featureId: "PG-009",
    name: "분당점 시간표",
    path: "/sub/schedule.g",
    readyText: "3학년 독해/어휘반(주중반) 4회",
  },
  {
    featureId: "PG-010",
    name: "현장설명회 예약",
    path: "/sub/Presentation",
    readyText: "2027 신학기 학부모 설명회 (대치)",
  },
  {
    featureId: "PG-011",
    name: "예약 확인 / 취소",
    path: "/sub/Check",
    readyText: "예약 정보 입력 인증",
  },
  {
    featureId: "PG-012",
    name: "공지사항 목록",
    path: "/notice",
    readyText: "2027 신학기 강좌 안내",
  },
  {
    featureId: "PG-012",
    name: "공지사항 상세",
    path: `/notice/${SEED_NOTICE_ID}`,
    readyText: "2027 신학기 강좌 안내",
  },
  { featureId: "PG-013", name: "로그인", path: "/login", readyText: "회원 로그인" },
  {
    featureId: "PG-014",
    name: "회원가입",
    path: "/register",
    readyText: "(필수) 회원가입약관",
  },
  {
    featureId: "FM-003",
    name: "아이디·비밀번호 찾기",
    path: "/account/recovery",
    readyText: "아이디 찾기",
  },
  {
    featureId: "FM-003",
    name: "비밀번호 재설정",
    path: "/account/password-reset",
    readyText: "새 비밀번호 설정",
  },
];

/**
 * 개발 서버가 띄우는 Next.js 개발 도구 단추를 화면에서 치운다.
 * 테스트는 `npm run dev` 서버를 쓰므로 이 단추가 스냅샷에 끼어든다. 앱 코드가 아니다.
 */
export async function hideDevOverlay(page: Page): Promise<void> {
  await page.addStyleTag({
    content: "nextjs-portal, [data-nextjs-toast] { display: none !important; }",
  });
}

/** 화면이 다 그려질 때까지 기다린다. PPR 로 흘러오는 본문까지 포함한다. */
export async function waitForPage(page: Page, testCase: PublicPageCase): Promise<void> {
  await page.goto(testCase.path, { waitUntil: "domcontentloaded" });
  await hideDevOverlay(page);
  await page.getByText(testCase.readyText, { exact: false }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  // 글꼴이 다 올라온 뒤에 찍는다. 반환값은 직렬화할 수 있는 값으로 바꾼다.
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

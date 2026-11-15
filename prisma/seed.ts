import "dotenv/config";
import {
  CONSULTATION_PRIVACY_CONSENT,
  COURSE_PRIVACY_CONSENT,
  DEFAULT_CONSULTATION_TYPES,
  DEFAULT_INSTRUCTOR_APPLICATION_STATUSES,
  EVENT_PRIVACY_CONSENT,
  INSTRUCTOR_PRIVACY_CONSENT,
  SMS_SUBSCRIPTION_CONSENT,
} from "@/lib/contracts";
import {
  DEFAULT_FACILITY_PHOTOS,
  DEFAULT_HOME_BANNERS,
  FACILITY_SLIDE_PHOTOS,
} from "@/lib/images";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { envValue } from "@/server/env";
import { registerLegacyMediaAssets } from "@/server/services/media";
import { fixturePassword } from "../tests/fixtures/passwords";

/**
 * 가짜 데이터만 넣는다. 실제 학생·학부모 정보를 쓰지 않는다. (CLAUDE.md 3장)
 * 같은 id로 upsert 하므로 여러 번 실행해도 안전하다.
 */

const CAMPUSES = [
  { id: "seed-campus-daechi", name: "대치본원" },
  { id: "seed-campus-bundang", name: "분당점" },
] as const;

const COURSES = [
  {
    id: "seed-course-01",
    campusId: "seed-campus-daechi",
    sectionTitle: "정규강좌",
    gradeTitle: "예비초",
    title: "예비초 문해력 기초반(주중반) 4회",
    scheduleText: "화,수,목,금 15/18시",
    startDate: "2027-03-02T00:00:00.000Z",
    displayOrder: 1,
    intakeOpen: true,
  },
  {
    id: "seed-course-02",
    campusId: "seed-campus-daechi",
    sectionTitle: "정규강좌",
    gradeTitle: "초등학교 1학년",
    title: "1학년 독해/어휘반(주중반) 4회",
    scheduleText: "화,수,목,금 15/18시",
    startDate: "2027-03-02T00:00:00.000Z",
    displayOrder: 2,
    intakeOpen: true,
  },
  {
    id: "seed-course-03",
    campusId: "seed-campus-daechi",
    sectionTitle: "정규강좌",
    gradeTitle: "초등학교 2학년",
    title: "2학년 독해/글쓰기반(주중반) 4회",
    scheduleText: "화,수,목,금 15/18시",
    startDate: "2027-03-02T00:00:00.000Z",
    displayOrder: 3,
    intakeOpen: true,
  },
  {
    id: "seed-course-04",
    campusId: "seed-campus-daechi",
    sectionTitle: "정규강좌",
    gradeTitle: "초등학교 4학년",
    title: "4학년 독해/논리반(주중반) 4회",
    scheduleText: "화,수,목,금 15/18시",
    startDate: "2027-03-02T00:00:00.000Z",
    displayOrder: 4,
    intakeOpen: true,
  },
  {
    id: "seed-course-05",
    campusId: "seed-campus-daechi",
    sectionTitle: "특강",
    gradeTitle: "초등학교 5학년",
    title: "5학년 비문학 독해 특강(주말반) 8회",
    scheduleText: "토 10/14시",
    startDate: "2027-03-06T00:00:00.000Z",
    displayOrder: 5,
    intakeOpen: false,
  },
  {
    id: "seed-course-06",
    campusId: "seed-campus-daechi",
    sectionTitle: "진단평가",
    gradeTitle: "초등학교 6학년",
    title: "6학년 문해력 진단평가 1회",
    scheduleText: "토 11시",
    startDate: "2027-02-28T00:00:00.000Z",
    displayOrder: 6,
    intakeOpen: true,
  },
  {
    id: "seed-course-07",
    campusId: "seed-campus-bundang",
    sectionTitle: "정규강좌",
    gradeTitle: "초등학교 3학년",
    title: "3학년 독해/어휘반(주중반) 4회",
    scheduleText: "월,화,수,목 15/17시",
    startDate: "2027-03-02T00:00:00.000Z",
    displayOrder: 1,
    intakeOpen: true,
  },
  {
    id: "seed-course-08",
    campusId: "seed-campus-bundang",
    sectionTitle: "정규강좌",
    gradeTitle: "초등학교 4학년",
    title: "4학년 글쓰기 심화반(주중반) 4회",
    scheduleText: "월,화,수,목 16/18시",
    startDate: "2027-03-02T00:00:00.000Z",
    displayOrder: 2,
    intakeOpen: true,
  },
] as const;

const STATUS_OPTIONS = [
  { id: "seed-status-open", label: "접수중", sortOrder: 1, isClosed: false },
  { id: "seed-status-soon", label: "마감임박", sortOrder: 2, isClosed: false },
  { id: "seed-status-closed", label: "접수마감", sortOrder: 3, isClosed: true },
] as const;

const EVENTS = [
  {
    id: "seed-event-01",
    campusId: "seed-campus-daechi",
    managementCode: "2027D1",
    title: "2027 신학기 학부모 설명회 (대치)",
    startsAt: "2027-02-20T02:00:00.000Z",
    venue: "대치본원 3층 강의실",
    speaker: "가상 원장",
    statusOptionId: "seed-status-open",
  },
  {
    id: "seed-event-02",
    campusId: "seed-campus-bundang",
    managementCode: "2027B1",
    title: "2027 신학기 학부모 설명회 (분당)",
    startsAt: "2027-02-21T02:00:00.000Z",
    venue: "분당점 2층 세미나실",
    speaker: "가상 부원장",
    statusOptionId: "seed-status-soon",
  },
  {
    id: "seed-event-03",
    campusId: "seed-campus-daechi",
    managementCode: "2026D5",
    title: "2026 겨울 특강 설명회",
    startsAt: "2026-12-05T02:00:00.000Z",
    venue: "대치본원 3층 강의실",
    speaker: "가상 강사",
    statusOptionId: "seed-status-closed",
  },
  {
    id: "seed-event-04",
    campusId: null,
    managementCode: "2027ON1",
    title: "온라인 문해력 진단 안내 설명회",
    startsAt: "2027-01-15T10:00:00.000Z",
    venue: null,
    speaker: "가상 연구원",
    statusOptionId: "seed-status-open",
  },
] as const;

const TEAMS = [
  { id: "seed-team-daechi", name: "대치팀" },
  { id: "seed-team-bundang", name: "분당팀" },
] as const;

const INSTRUCTORS = [
  {
    id: "seed-instructor-01",
    name: "가상강사A",
    profileCode: "tch-a",
    bio: "샘플 약력입니다. 실제 인물 정보가 아닙니다.",
  },
  {
    id: "seed-instructor-02",
    name: "가상강사B",
    profileCode: "tch-b",
    bio: "샘플 약력입니다. 실제 인물 정보가 아닙니다.",
  },
  {
    id: "seed-instructor-03",
    name: "가상강사C",
    profileCode: "tch-c",
    bio: "샘플 약력입니다. 실제 인물 정보가 아닙니다.",
  },
] as const;

/** 가상강사A는 대치팀·분당팀 두 곳에 속한다. (ASM-003) */
const MEMBERSHIPS = [
  { instructorId: "seed-instructor-01", teamId: "seed-team-daechi", displayOrder: 1 },
  { instructorId: "seed-instructor-01", teamId: "seed-team-bundang", displayOrder: 2 },
  { instructorId: "seed-instructor-02", teamId: "seed-team-daechi", displayOrder: 2 },
  { instructorId: "seed-instructor-03", teamId: "seed-team-bundang", displayOrder: 1 },
] as const;

const NOTICES = [
  {
    id: "seed-notice-01",
    title: "2027 신학기 강좌 안내",
    body: "샘플 공지 본문입니다. 신학기 강좌 일정은 시간표에서 확인해 주세요.",
    isPinned: true,
    publishedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    id: "seed-notice-02",
    title: "설명회 예약 방법 안내",
    body: "샘플 공지 본문입니다. 설명회 예약은 설명회 목록에서 신청할 수 있습니다.",
    isPinned: false,
    publishedAt: "2026-10-20T00:00:00.000Z",
  },
  {
    id: "seed-notice-03",
    title: "개인정보 보존 기준 변경 안내",
    body: "샘플 공지 본문입니다. 보존 기준은 관리자 설정에서 관리합니다.",
    isPinned: false,
    publishedAt: "2026-10-01T00:00:00.000Z",
  },
] as const;

async function seedAccounts(): Promise<void> {
  // 분명히 가짜인 기본값을 쓴다. 운영에서는 환경 변수로 넣고 첫 로그인 후 바꾼다.
  // 빈 문자열(`SEED_ADMIN_PASSWORD=`)은 "값 없음"으로 본다. 빈 비밀번호를 해시하지 않는다.
  const adminPassword =
    envValue("SEED_ADMIN_PASSWORD") ?? fixturePassword("admin-0000");
  const memberPassword =
    envValue("SEED_MEMBER_PASSWORD") ?? fixturePassword("member-0000");

  // 비밀번호도 다시 맞춘다. 기본값이 바뀌었는데 기존 행을 그대로 두면 아래에 찍히는
  // 자격 증명으로 로그인할 수 없다. 가짜 데이터 seed 에서만 하는 처리다.
  await db.user.upsert({
    where: { loginId: "admin" },
    update: { passwordHash: await hashPassword(adminPassword), status: "ACTIVE" },
    create: {
      id: "seed-user-admin",
      loginId: "admin",
      passwordHash: await hashPassword(adminPassword),
      name: "가상관리자",
      email: "admin@example.test",
      phone: "010-0000-0000",
      role: "ADMIN",
    },
  });

  await db.user.upsert({
    where: { loginId: "member01" },
    update: { passwordHash: await hashPassword(memberPassword), status: "ACTIVE" },
    create: {
      id: "seed-user-member",
      loginId: "member01",
      passwordHash: await hashPassword(memberPassword),
      name: "가상회원",
      email: "member01@example.test",
      phone: "010-0000-0001",
      role: "MEMBER",
    },
  });

  // 자격 증명은 seed 실행 중 표준출력에만 보여 준다. 파일이나 DB 로그에는 남기지 않는다.
  console.info("[seed] 관리자 로그인: admin /", adminPassword);
  console.info("[seed] 회원 로그인: member01 /", memberPassword);
}

async function main(): Promise<void> {
  for (const campus of CAMPUSES) {
    await db.campus.upsert({
      where: { id: campus.id },
      update: { name: campus.name },
      create: { id: campus.id, name: campus.name },
    });
  }

  for (const course of COURSES) {
    const data = {
      campusId: course.campusId,
      title: course.title,
      sectionTitle: course.sectionTitle,
      gradeTitle: course.gradeTitle,
      scheduleText: course.scheduleText,
      startDate: new Date(course.startDate),
      displayOrder: course.displayOrder,
      intakeStatus: course.intakeOpen ? ("OPEN" as const) : ("CLOSED" as const),
    };
    await db.course.upsert({
      where: { id: course.id },
      update: data,
      create: { id: course.id, ...data },
    });
  }

  for (const option of STATUS_OPTIONS) {
    const data = {
      label: option.label,
      sortOrder: option.sortOrder,
      isClosed: option.isClosed,
    };
    await db.eventStatusOption.upsert({
      where: { id: option.id },
      update: data,
      create: { id: option.id, ...data },
    });
  }

  for (const event of EVENTS) {
    const data = {
      campusId: event.campusId,
      managementCode: event.managementCode,
      title: event.title,
      startsAt: new Date(event.startsAt),
      venue: event.venue,
      speaker: event.speaker,
      statusOptionId: event.statusOptionId,
    };
    await db.event.upsert({
      where: { id: event.id },
      update: data,
      create: { id: event.id, ...data },
    });
  }

  for (const team of TEAMS) {
    await db.instructorTeam.upsert({
      where: { id: team.id },
      update: { name: team.name },
      create: { id: team.id, name: team.name },
    });
  }

  for (const instructor of INSTRUCTORS) {
    const data = {
      name: instructor.name,
      profileCode: instructor.profileCode,
      bio: instructor.bio,
      // AD-015 로 붙인 사진은 떼어낸다. seed 는 "늘 같은 상태"를 만들어야 하는데,
      // 사진이 남아 있으면 강사 카드가 로고 대체(ASM-080) 대신 그 사진을 보여 줘서
      // PG-005 시각 회귀 기준 이미지와 달라진다. 비밀번호를 다시 맞추는 것과 같은 이유다.
      photoMediaId: null,
    };
    await db.instructor.upsert({
      where: { id: instructor.id },
      update: data,
      create: { id: instructor.id, ...data },
    });
  }

  await seedSiteImages();

  for (const membership of MEMBERSHIPS) {
    await db.instructorTeamMembership.upsert({
      where: {
        instructorId_teamId: {
          instructorId: membership.instructorId,
          teamId: membership.teamId,
        },
      },
      update: { displayOrder: membership.displayOrder },
      create: {
        instructorId: membership.instructorId,
        teamId: membership.teamId,
        displayOrder: membership.displayOrder,
      },
    });
  }

  for (const notice of NOTICES) {
    const data = {
      title: notice.title,
      body: notice.body,
      isPinned: notice.isPinned,
      // 시드 공지는 바로 공개된다. 임시 저장 상태 확인은 테스트에서 따로 한다. (AD-014)
      status: "PUBLISHED" as const,
      publishedAt: new Date(notice.publishedAt),
    };
    await db.notice.upsert({
      where: { id: notice.id },
      update: data,
      create: { id: notice.id, ...data },
    });
  }

  // 보존 설정은 한 행만 쓰고 기본 문구는 레거시 동의 문구(EV-0006)와 같은 값을 쓴다. (ASM-009)
  await db.privacyRetentionSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      courseRetentionPolicy: COURSE_PRIVACY_CONSENT.retention,
      eventRetentionPolicy: EVENT_PRIVACY_CONSENT.retention,
      consultationRetentionPolicy: CONSULTATION_PRIVACY_CONSENT.retention,
      instructorRetentionPolicy: INSTRUCTOR_PRIVACY_CONSENT.retention,
      smsRetentionPolicy: SMS_SUBSCRIPTION_CONSENT.retention,
      automaticPurgeEnabled: false,
    },
  });

  // AD-009 상담 유형 기본 목록. 관리자가 추가·수정할 수 있다. // ASM-083
  for (const [index, label] of DEFAULT_CONSULTATION_TYPES.entries()) {
    await db.consultationTypeOption.upsert({
      where: { label },
      update: {},
      create: { label, sortOrder: index },
    });
  }

  // AD-011 강사 지원 상태 기본 목록. // ASM-087
  for (const [index, label] of DEFAULT_INSTRUCTOR_APPLICATION_STATUSES.entries()) {
    await db.instructorApplicationStatusOption.upsert({
      where: { label },
      update: {},
      create: { label, sortOrder: index },
    });
  }

  await seedAccounts();

  console.info("[seed] 완료");
}

/**
 * AD-015 이미지 보관함과 화면 연결의 초기 데이터.
 *
 * 1. `public/images/` 에 커밋된 레거시 사진을 보관함에 등록한다.
 * 2. 지금 코드에 박혀 있던 메인 배너 3장과 지점별 시설 사진 4장씩을 행으로 만든다.
 *    그래서 관리자 화면에서 바로 한 장씩 바꿀 수 있고, 공개 화면 모양은 그대로다.
 * 3. 시드 강사 1명에게 보관함 사진을 붙여 사진 연결이 도는지 눈으로 확인할 수 있게 한다.
 *
 * 모두 주소(url)로 찾아 upsert 하므로 여러 번 실행해도 늘어나지 않는다.
 */
async function seedSiteImages(): Promise<void> {
  const registered = await registerLegacyMediaAssets();
  console.info(
    `[seed] 기존 사이트 사진 ${registered.created}장 등록 (이미 있던 것 ${registered.existing}장)`,
  );

  async function mediaIdFor(url: string): Promise<string | null> {
    const row = await db.mediaAsset.findUnique({
      where: { url },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  // 메인 배너 3장. 문구·버튼은 Phase 3 화면과 같은 값이다.
  for (const [index, banner] of DEFAULT_HOME_BANNERS.entries()) {
    const id = `seed-home-banner-${String(index + 1).padStart(2, "0")}`;
    const mediaId = banner.backgroundUrl
      ? await mediaIdFor(banner.backgroundUrl)
      : null;
    const data = {
      mediaId,
      eyebrow: banner.eyebrow,
      headline: banner.headline,
      body: banner.body,
      primaryLabel: banner.primaryLabel || null,
      primaryHref: banner.primaryHref || null,
      secondaryLabel: banner.secondaryLabel || null,
      secondaryHref: banner.secondaryHref || null,
      displayOrder: index + 1,
      isVisible: true,
    };
    await db.homeBanner.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  // 지점별 시설 사진. 설명은 레거시처럼 비워 둔다(장식용).
  for (const campusKey of Object.keys(FACILITY_SLIDE_PHOTOS)) {
    const photos = DEFAULT_FACILITY_PHOTOS[campusKey] ?? [];
    for (const [index, photo] of photos.entries()) {
      const mediaId = await mediaIdFor(photo.url);
      if (!mediaId) continue;

      const id = `seed-facility-${campusKey}-${String(index + 1).padStart(2, "0")}`;
      const data = {
        campusKey,
        mediaId,
        caption: photo.caption,
        displayOrder: index + 1,
        isVisible: true,
      };
      await db.facilityPhoto.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    }
  }

  // 시드 강사 1명에게 보관함 사진을 붙인다. 가짜 데이터이고 실제 인물이 아니다.
  const samplePhotoId = await mediaIdFor("/images/instructors/munsayu-class.jpg");
  if (samplePhotoId) {
    await db.instructor.update({
      where: { id: "seed-instructor-01" },
      data: { photoMediaId: samplePhotoId },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("[seed] 실패", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

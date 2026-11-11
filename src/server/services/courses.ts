import "server-only";
import type { Course } from "@prisma/client";
import type {
  CourseIntakeChangeInput,
  CourseUpsertInput,
  PaginationInput,
} from "@/lib/contracts";
import { db } from "@/server/db";
import { conflict, notFound, validationFailed } from "@/server/errors";

export type PublicCourse = {
  id: string;
  campusId: string;
  campusName: string;
  title: string;
  sectionTitle: string | null;
  gradeTitle: string | null;
  scheduleText: string | null;
  startDate: string | null;
  intakeOpen: boolean;
};

/** PG-008/009 공개 시간표. 지점으로 걸러 출력순서대로 돌려준다. */
export async function listPublicCourses(options: {
  campusId?: string;
}): Promise<PublicCourse[]> {
  const courses = await db.course.findMany({
    where: options.campusId ? { campusId: options.campusId } : {},
    orderBy: [{ campusId: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    include: { campus: { select: { name: true } } },
  });

  return courses.map((course) => ({
    id: course.id,
    campusId: course.campusId,
    campusName: course.campus.name,
    title: course.title,
    sectionTitle: course.sectionTitle,
    gradeTitle: course.gradeTitle,
    scheduleText: course.scheduleText,
    startDate: course.startDate?.toISOString() ?? null,
    intakeOpen: course.intakeStatus === "OPEN",
  }));
}

export type AdminCourseRow = PublicCourse & {
  displayOrder: number;
  applicationCount: number;
};

/** AD-007 시간표 관리 목록. 신청현황 건수를 함께 보여 준다. (EV-ADM-05) */
export async function listAdminCourses(
  options: { campusId?: string; intakeOpen?: boolean } & Partial<PaginationInput>,
): Promise<{ items: AdminCourseRow[]; total: number }> {
  const where = {
    ...(options.campusId ? { campusId: options.campusId } : {}),
    ...(options.intakeOpen === undefined
      ? {}
      : { intakeStatus: options.intakeOpen ? ("OPEN" as const) : ("CLOSED" as const) }),
  };
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  const [total, courses] = await Promise.all([
    db.course.count({ where }),
    db.course.findMany({
      where,
      orderBy: [{ campusId: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        campus: { select: { name: true } },
        _count: { select: { applications: true } },
      },
    }),
  ]);

  return {
    total,
    items: courses.map((course) => ({
      id: course.id,
      campusId: course.campusId,
      campusName: course.campus.name,
      title: course.title,
      sectionTitle: course.sectionTitle,
      gradeTitle: course.gradeTitle,
      scheduleText: course.scheduleText,
      startDate: course.startDate?.toISOString() ?? null,
      intakeOpen: course.intakeStatus === "OPEN",
      displayOrder: course.displayOrder,
      applicationCount: course._count.applications,
    })),
  };
}

async function assertCampusExists(campusId: string): Promise<void> {
  const campus = await db.campus.findUnique({
    where: { id: campusId },
    select: { id: true },
  });
  if (!campus) {
    throw validationFailed({ campusId: ["지점을 찾을 수 없습니다."] });
  }
}

export async function createCourse(input: CourseUpsertInput): Promise<Course> {
  await assertCampusExists(input.campusId);
  return db.course.create({
    data: {
      campusId: input.campusId,
      title: input.title,
      sectionTitle: input.sectionTitle,
      gradeTitle: input.gradeTitle,
      scheduleText: input.scheduleText,
      startDate: input.startDate,
      displayOrder: input.displayOrder,
      intakeStatus: input.intakeOpen ? "OPEN" : "CLOSED",
    },
  });
}

export async function updateCourse(
  courseId: string,
  input: CourseUpsertInput,
): Promise<Course> {
  const existing = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!existing) throw notFound();
  await assertCampusExists(input.campusId);

  return db.course.update({
    where: { id: courseId },
    data: {
      campusId: input.campusId,
      title: input.title,
      sectionTitle: input.sectionTitle,
      gradeTitle: input.gradeTitle,
      scheduleText: input.scheduleText,
      startDate: input.startDate,
      displayOrder: input.displayOrder,
      intakeStatus: input.intakeOpen ? "OPEN" : "CLOSED",
    },
  });
}

/** 신청 기록이 있는 강좌는 지우지 않는다. 기록을 함께 잃지 않기 위한 제한이다. */
export async function deleteCourse(courseId: string): Promise<void> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { _count: { select: { applications: true } } },
  });
  if (!course) throw notFound();
  if (course._count.applications > 0) {
    throw conflict(
      "신청 기록이 있는 강좌는 삭제할 수 없습니다. 접수마감으로 바꿔 주세요.",
    );
  }
  await db.course.delete({ where: { id: courseId } });
}

/** BZ-001 강좌 접수 상태는 관리자가 직접 바꾼다. 자동 전환은 없다. (Q-ADM-05) */
export async function setCourseIntake(input: CourseIntakeChangeInput): Promise<Course> {
  const existing = await db.course.findUnique({
    where: { id: input.courseId },
    select: { id: true },
  });
  if (!existing) throw notFound();

  return db.course.update({
    where: { id: input.courseId },
    data: { intakeStatus: input.intakeOpen ? "OPEN" : "CLOSED" },
  });
}

export async function listCampuses(): Promise<{ id: string; name: string }[]> {
  return db.campus.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

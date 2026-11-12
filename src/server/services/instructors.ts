import "server-only";
import type { Instructor, InstructorTeam } from "@prisma/client";
import type {
  InstructorTeamMembershipInput,
  InstructorUpsertInput,
} from "@/lib/contracts";
import { db } from "@/server/db";
import { conflict, notFound, validationFailed } from "@/server/errors";

export type InstructorWithTeams = {
  id: string;
  name: string;
  profileCode: string;
  bio: string | null;
  photoStorageKey: string | null;
  teams: { teamId: string; teamName: string; displayOrder: number }[];
};

/** AD-006 강사 목록. 한 강사가 여러 팀에 속할 수 있다. (ASM-003) */
export async function listInstructors(): Promise<InstructorWithTeams[]> {
  const instructors = await db.instructor.findMany({
    orderBy: { name: "asc" },
    include: {
      memberships: {
        orderBy: { displayOrder: "asc" },
        include: { team: { select: { id: true, name: true } } },
      },
    },
  });

  return instructors.map((instructor) => ({
    id: instructor.id,
    name: instructor.name,
    profileCode: instructor.profileCode,
    bio: instructor.bio,
    photoStorageKey: instructor.photoStorageKey,
    teams: instructor.memberships.map((membership) => ({
      teamId: membership.team.id,
      teamName: membership.team.name,
      displayOrder: membership.displayOrder,
    })),
  }));
}

export type TeamWithInstructors = {
  id: string;
  name: string;
  instructors: { instructorId: string; name: string; displayOrder: number }[];
};

/** 팀별 노출 순서는 팀마다 따로 둔다. `teamId`를 주면 그 팀만 돌려준다. (ASM-003) */
export async function listTeams(
  options: { teamId?: string } = {},
): Promise<TeamWithInstructors[]> {
  const teams = await db.instructorTeam.findMany({
    where: options.teamId ? { id: options.teamId } : {},
    orderBy: { name: "asc" },
    include: {
      memberships: {
        orderBy: [{ displayOrder: "asc" }],
        include: { instructor: { select: { id: true, name: true } } },
      },
    },
  });

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    instructors: team.memberships.map((membership) => ({
      instructorId: membership.instructor.id,
      name: membership.instructor.name,
      displayOrder: membership.displayOrder,
    })),
  }));
}

export async function createTeam(name: string): Promise<InstructorTeam> {
  const existing = await db.instructorTeam.findUnique({
    where: { name },
    select: { id: true },
  });
  if (existing) throw conflict("같은 이름의 팀이 이미 있습니다.");
  return db.instructorTeam.create({ data: { name } });
}

export async function createInstructor(
  input: InstructorUpsertInput,
): Promise<Instructor> {
  const existing = await db.instructor.findUnique({
    where: { profileCode: input.profileCode },
    select: { id: true },
  });
  if (existing) throw conflict("같은 프로필 코드의 강사가 이미 있습니다.");

  return db.instructor.create({
    data: {
      name: input.name,
      profileCode: input.profileCode,
      bio: input.bio,
      photoStorageKey: input.photoStorageKey,
    },
  });
}

export async function updateInstructor(
  instructorId: string,
  input: InstructorUpsertInput,
): Promise<Instructor> {
  const existing = await db.instructor.findUnique({
    where: { id: instructorId },
    select: { id: true },
  });
  if (!existing) throw notFound();

  const duplicate = await db.instructor.findFirst({
    where: { profileCode: input.profileCode, id: { not: instructorId } },
    select: { id: true },
  });
  if (duplicate) throw conflict("같은 프로필 코드의 강사가 이미 있습니다.");

  return db.instructor.update({
    where: { id: instructorId },
    data: {
      name: input.name,
      profileCode: input.profileCode,
      bio: input.bio,
      photoStorageKey: input.photoStorageKey,
    },
  });
}

export async function deleteInstructor(instructorId: string): Promise<void> {
  const existing = await db.instructor.findUnique({
    where: { id: instructorId },
    select: { id: true },
  });
  if (!existing) throw notFound();
  await db.instructor.delete({ where: { id: instructorId } });
}

/** 팀 소속을 추가하거나 노출 순서를 바꾼다. 같은 강사를 여러 팀에 넣을 수 있다. */
export async function setTeamMembership(
  input: InstructorTeamMembershipInput,
): Promise<void> {
  const [instructor, team] = await Promise.all([
    db.instructor.findUnique({
      where: { id: input.instructorId },
      select: { id: true },
    }),
    db.instructorTeam.findUnique({ where: { id: input.teamId }, select: { id: true } }),
  ]);
  if (!instructor)
    throw validationFailed({ instructorId: ["강사를 찾을 수 없습니다."] });
  if (!team) throw validationFailed({ teamId: ["팀을 찾을 수 없습니다."] });

  await db.instructorTeamMembership.upsert({
    where: {
      instructorId_teamId: { instructorId: input.instructorId, teamId: input.teamId },
    },
    create: {
      instructorId: input.instructorId,
      teamId: input.teamId,
      displayOrder: input.displayOrder,
    },
    update: { displayOrder: input.displayOrder },
  });
}

export async function removeTeamMembership(
  instructorId: string,
  teamId: string,
): Promise<void> {
  const result = await db.instructorTeamMembership.deleteMany({
    where: { instructorId, teamId },
  });
  if (result.count === 0) throw notFound();
}

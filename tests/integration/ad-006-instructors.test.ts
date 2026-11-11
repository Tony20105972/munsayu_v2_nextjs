import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import {
  GET as instructorsGet,
  POST as instructorsPost,
} from "../../app/api/admin/instructors/route";
import {
  PUT as instructorPut,
  DELETE as instructorDelete,
} from "../../app/api/admin/instructors/[id]/route";
import {
  POST as membershipPost,
  DELETE as membershipDelete,
} from "../../app/api/admin/instructors/memberships/route";
import {
  GET as teamsGet,
  POST as teamsPost,
} from "../../app/api/admin/instructor-teams/route";
import { GET as publicInstructors } from "../../app/api/instructors/route";
import { adminCookie, makeRequest, resetDatabase, routeContext } from "./helpers";

let cookie: string;

async function createTeam(name: string): Promise<string> {
  const response = await teamsPost(
    makeRequest("POST", "/api/admin/instructor-teams", { cookie, body: { name } }),
  );
  expect(response.status).toBe(201);
  return (await response.json()).id;
}

async function createInstructor(name: string, profileCode: string): Promise<string> {
  const response = await instructorsPost(
    makeRequest("POST", "/api/admin/instructors", {
      cookie,
      body: { name, profileCode, bio: "샘플 약력", photoStorageKey: null },
    }),
  );
  expect(response.status).toBe(201);
  return (await response.json()).id;
}

beforeEach(async () => {
  await resetDatabase();
  cookie = await adminCookie();
});

describe("AD-006 강사·팀 관리", () => {
  test("AD-006 강사 추가·수정·삭제가 된다", async () => {
    const id = await createInstructor("가상강사A", "tch-a");

    const updated = await instructorPut(
      makeRequest("PUT", `/api/admin/instructors/${id}`, {
        cookie,
        body: {
          name: "가상강사A2",
          profileCode: "tch-a2",
          bio: null,
          photoStorageKey: null,
        },
      }),
      routeContext({ id }),
    );
    expect(updated.status).toBe(200);

    const deleted = await instructorDelete(
      makeRequest("DELETE", `/api/admin/instructors/${id}`, { cookie }),
      routeContext({ id }),
    );
    expect(deleted.status).toBe(204);
    expect(await db.instructor.count()).toBe(0);
  });

  test("AD-006 강사 추가: 프로필 코드가 겹치면 409", async () => {
    await createInstructor("가상강사A", "tch-a");

    const response = await instructorsPost(
      makeRequest("POST", "/api/admin/instructors", {
        cookie,
        body: { name: "가상강사B", profileCode: "tch-a" },
      }),
    );
    expect(response.status).toBe(409);
  });

  test("AD-006 한 강사가 두 팀에 소속되고 팀별 순서가 따로 저장된다", async () => {
    const daechi = await createTeam("대치팀");
    const bundang = await createTeam("분당팀");
    const shared = await createInstructor("가상강사A", "tch-a");
    const onlyDaechi = await createInstructor("가상강사B", "tch-b");
    const onlyBundang = await createInstructor("가상강사C", "tch-c");

    for (const membership of [
      { instructorId: shared, teamId: daechi, displayOrder: 2 },
      { instructorId: shared, teamId: bundang, displayOrder: 1 },
      { instructorId: onlyDaechi, teamId: daechi, displayOrder: 1 },
      { instructorId: onlyBundang, teamId: bundang, displayOrder: 2 },
    ]) {
      const response = await membershipPost(
        makeRequest("POST", "/api/admin/instructors/memberships", {
          cookie,
          body: membership,
        }),
      );
      expect(response.status).toBe(204);
    }

    const teams = await teamsGet(
      makeRequest("GET", "/api/admin/instructor-teams", { cookie }),
    );
    const body = await teams.json();
    const daechiTeam = body.items.find((team: { id: string }) => team.id === daechi);
    const bundangTeam = body.items.find((team: { id: string }) => team.id === bundang);

    expect(daechiTeam.instructors.map((row: { name: string }) => row.name)).toEqual([
      "가상강사B",
      "가상강사A",
    ]);
    expect(bundangTeam.instructors.map((row: { name: string }) => row.name)).toEqual([
      "가상강사A",
      "가상강사C",
    ]);

    const instructors = await instructorsGet(
      makeRequest("GET", "/api/admin/instructors", { cookie }),
    );
    const sharedRow = (await instructors.json()).items.find(
      (row: { id: string }) => row.id === shared,
    );
    expect(sharedRow.teams).toHaveLength(2);
  });

  test("AD-006 팀 소속 순서를 다시 보내면 순서만 바뀐다", async () => {
    const team = await createTeam("대치팀");
    const instructor = await createInstructor("가상강사A", "tch-a");

    await membershipPost(
      makeRequest("POST", "/api/admin/instructors/memberships", {
        cookie,
        body: { instructorId: instructor, teamId: team, displayOrder: 1 },
      }),
    );
    await membershipPost(
      makeRequest("POST", "/api/admin/instructors/memberships", {
        cookie,
        body: { instructorId: instructor, teamId: team, displayOrder: 5 },
      }),
    );

    const memberships = await db.instructorTeamMembership.findMany();
    expect(memberships).toHaveLength(1);
    expect(memberships[0].displayOrder).toBe(5);
  });

  test("AD-006 팀 소속을 지우면 강사는 남는다", async () => {
    const team = await createTeam("대치팀");
    const instructor = await createInstructor("가상강사A", "tch-a");
    await membershipPost(
      makeRequest("POST", "/api/admin/instructors/memberships", {
        cookie,
        body: { instructorId: instructor, teamId: team, displayOrder: 1 },
      }),
    );

    const response = await membershipDelete(
      makeRequest("DELETE", "/api/admin/instructors/memberships", {
        cookie,
        body: { instructorId: instructor, teamId: team },
      }),
    );
    expect(response.status).toBe(204);
    expect(await db.instructorTeamMembership.count()).toBe(0);
    expect(await db.instructor.count()).toBe(1);
  });

  test("AD-006 팀 소속 추가: 없는 강사·팀이면 422", async () => {
    const team = await createTeam("대치팀");

    const response = await membershipPost(
      makeRequest("POST", "/api/admin/instructors/memberships", {
        cookie,
        body: { instructorId: "missing-id", teamId: team, displayOrder: 1 },
      }),
    );
    expect(response.status).toBe(422);
    expect(Object.keys((await response.json()).fieldErrors)).toContain("instructorId");
  });

  test("AD-006 공개 강사진 목록도 팀별 순서를 따른다", async () => {
    const team = await createTeam("대치팀");
    const first = await createInstructor("가상강사A", "tch-a");
    const second = await createInstructor("가상강사B", "tch-b");
    await membershipPost(
      makeRequest("POST", "/api/admin/instructors/memberships", {
        cookie,
        body: { instructorId: first, teamId: team, displayOrder: 2 },
      }),
    );
    await membershipPost(
      makeRequest("POST", "/api/admin/instructors/memberships", {
        cookie,
        body: { instructorId: second, teamId: team, displayOrder: 1 },
      }),
    );

    const response = await publicInstructors();
    const body = await response.json();
    expect(body.teams[0].instructors.map((row: { name: string }) => row.name)).toEqual([
      "가상강사B",
      "가상강사A",
    ]);
  });
});

import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, test } from "vitest";
import sharp from "sharp";
import {
  describeMediaDeleteResult,
  MEDIA_BULK_DELETE_MAX,
  MEDIA_MESSAGES,
} from "@/lib/contracts";
import { getStorageAdapter } from "@/server/adapters/storage";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  createMediaUploadTicket,
  deleteMediaAsset,
  deleteMediaAssets,
  finalizeMediaUpload,
  listMediaAssets,
  listMediaOptions,
  registerLegacyMediaAssets,
  setMediaHidden,
} from "@/server/services/media";
import { upsertFacilityPhoto, upsertHomeBanner } from "@/server/services/site-images";
import { createInstructor } from "@/server/services/instructors";
import { PUT as directUploadPut } from "../../app/api/admin/media/direct-upload/route";
import { DELETE as mediaDelete } from "../../app/api/admin/media/route";
import { POST as mediaHide } from "../../app/api/admin/media/hide/route";
import {
  TEST_ORIGIN,
  adminCookie,
  makeRequest,
  memberCookie,
  resetDatabase,
} from "./helpers";

/**
 * AD-015 이미지 삭제·숨기기.
 *
 * 올린 사진은 기록과 저장소 파일을 함께 지운다. 기존 사이트 사진(`public/` 에 커밋된
 * 파일)은 실행 중에 지울 수 없어 숨기기로 처리한다. 쓰는 중인 사진은 둘 다 막는다.
 * 쓰는 그림은 모두 테스트가 만든 것이고 실제 학원 사진이 아니다.
 */

beforeEach(async () => {
  await resetDatabase();
});

async function makeJpeg(width = 120, height = 90): Promise<Uint8Array> {
  return new Uint8Array(
    await sharp({
      create: { width, height, channels: 3, background: { r: 20, g: 80, b: 40 } },
    })
      .jpeg()
      .toBuffer(),
  );
}

async function adminSession(): Promise<{ cookie: string; userId: string }> {
  const cookie = await adminCookie();
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  return { cookie, userId: admin.id };
}

/** 올리기 세 걸음(티켓 → 브라우저가 직접 전송 → 마무리)을 모두 거쳐 한 장을 넣는다. */
async function uploadOne(
  cookie: string,
  adminUserId: string,
  alt = "테스트 사진 설명",
): Promise<{ id: string; url: string; storageKey: string }> {
  const bytes = await makeJpeg();
  const ticket = await createMediaUploadTicket({
    filename: "photo.jpg",
    sizeBytes: bytes.byteLength,
  });

  const response = await directUploadPut(
    new Request(`${TEST_ORIGIN}${ticket.url}`, {
      method: "PUT",
      headers: { cookie, "content-type": "application/octet-stream" },
      body: bytes as unknown as BodyInit,
      duplex: "half",
    } as RequestInit & { duplex: "half" }),
  );
  expect(response.status).toBe(204);

  const row = await finalizeMediaUpload(adminUserId, {
    stagingKey: ticket.stagingKey,
    filename: "photo.jpg",
    alt,
  });
  const stored = await db.mediaAsset.findUniqueOrThrow({ where: { id: row.id } });
  return { id: row.id, url: row.url, storageKey: stored.storageKey ?? "" };
}

/** 저장소 공개 영역의 실제 경로. 파일이 함께 지워졌는지 볼 때만 쓴다. */
function publicPath(storageKey: string): string {
  return join(process.env.STORAGE_ROOT ?? "", "public", storageKey);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("AD-015 올린 사진 삭제", () => {
  test("쓰지 않는 사진은 DB 기록과 저장소 파일을 함께 지운다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId);
    expect(await fileExists(publicPath(media.storageKey))).toBe(true);

    const result = await deleteMediaAssets(userId, { mediaIds: [media.id] });

    expect(result.deleted).toEqual([{ id: media.id, filename: "photo.jpg" }]);
    expect(result.blocked).toEqual([]);
    expect(await db.mediaAsset.count()).toBe(0);
    expect(await fileExists(publicPath(media.storageKey))).toBe(false);
    await expect(getStorageAdapter().get("public", media.storageKey)).rejects.toThrow();

    // 누가 언제 무엇을 지웠는지 남는다. 파일 이름은 넣지 않는다. (AD-013)
    const log = await db.auditLog.findFirstOrThrow({
      where: { action: "MEDIA_DELETE" },
    });
    expect(log.actorUserId).toBe(userId);
    expect(log.resourceId).toBe(media.id);
    expect(log.filterSummary).not.toContain("photo.jpg");
  });

  test("파일을 지우지 못하면 DB 기록도 남겨 둔다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId);

    // 저장된 파일 자리를 폴더로 바꿔 둔다. 어댑터의 파일 삭제가 실패하는 실제 상황이고,
    // 이때 기록까지 지워지면 보이지 않는 파일이 저장소에 남는다.
    const target = publicPath(media.storageKey);
    await rm(target);
    await mkdir(target, { recursive: true });

    const result = await deleteMediaAssets(userId, { mediaIds: [media.id] });

    expect(result.deleted).toEqual([]);
    expect(result.blocked[0]).toMatchObject({ id: media.id, reason: "file" });
    // 기록이 남아 있어 목록에서 다시 지울 수 있다.
    expect(await db.mediaAsset.count({ where: { id: media.id } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "MEDIA_DELETE" } })).toBe(0);
  });

  test("없는 사진 id 는 막힌 것으로 돌려준다", async () => {
    const { userId } = await adminSession();

    const result = await deleteMediaAssets(userId, { mediaIds: ["no-such-media-id"] });

    expect(result.deleted).toEqual([]);
    expect(result.blocked[0]).toMatchObject({
      id: "no-such-media-id",
      reason: "missing",
    });
  });

  test("한 번에 고를 수 있는 수를 넘기면 받지 않는다", async () => {
    const tooMany = Array.from(
      { length: MEDIA_BULK_DELETE_MAX + 1 },
      (_, index) => `media-${index}`,
    );
    const { mediaBulkDeleteSchema } = await import("@/lib/contracts");

    expect(mediaBulkDeleteSchema.safeParse({ mediaIds: tooMany }).success).toBe(false);
    expect(mediaBulkDeleteSchema.safeParse({ mediaIds: [] }).success).toBe(false);
  });
});

describe("AD-015 쓰는 중인 사진", () => {
  test("강사 사진으로 쓰면 지울 수 없고 어디에 쓰는지 알려 준다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId);
    await createInstructor(userId, {
      name: "가상강사Z",
      profileCode: "tch-z",
      bio: null,
      photoMediaId: media.id,
    });

    const result = await deleteMediaAssets(userId, { mediaIds: [media.id] });

    expect(result.deleted).toEqual([]);
    expect(result.blocked[0]).toMatchObject({ reason: "in-use" });
    expect(result.blocked[0].usages[0]).toMatchObject({
      area: "강사 사진",
      label: "가상강사Z",
      adminHref: "/admin/instructors",
    });
    expect(await db.mediaAsset.count({ where: { id: media.id } })).toBe(1);

    // 한 장 삭제는 같은 내용을 문구로 던진다 — 화면의 확인 창이 그대로 보여 준다.
    try {
      await deleteMediaAsset(userId, { mediaId: media.id });
      throw new Error("오류가 나야 하는데 통과했습니다.");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(409);
      expect((error as AppError).message).toContain("강사 사진");
      expect((error as AppError).message).toContain("가상강사Z");
    }
  });

  test("쓰는 중인 사진은 숨기지도 못한다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId);
    await upsertHomeBanner(userId, {
      mediaId: media.id,
      eyebrow: "",
      headline: "테스트 배너",
      body: "",
      primaryLabel: "",
      primaryHref: "",
      secondaryLabel: "",
      secondaryHref: "",
      displayOrder: 1,
      isVisible: true,
    });

    try {
      await setMediaHidden(userId, { mediaId: media.id, hidden: true });
      throw new Error("오류가 나야 하는데 통과했습니다.");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(409);
      expect((error as AppError).message).toContain(MEDIA_MESSAGES.hideInUse);
      expect((error as AppError).message).toContain("메인 배너");
    }

    expect(
      (await db.mediaAsset.findUniqueOrThrow({ where: { id: media.id } })).hiddenAt,
    ).toBeNull();
  });
});

describe("AD-015 선택 삭제", () => {
  test("일부가 쓰는 중이면 나머지만 지우고 결과를 함께 돌려준다", async () => {
    const { cookie, userId } = await adminSession();
    const free1 = await uploadOne(cookie, userId, "안 쓰는 사진 1");
    const used = await uploadOne(cookie, userId, "쓰는 사진");
    const free2 = await uploadOne(cookie, userId, "안 쓰는 사진 2");

    await upsertFacilityPhoto(userId, {
      campusKey: "daechi",
      mediaId: used.id,
      caption: "",
      displayOrder: 1,
      isVisible: true,
    });

    const result = await deleteMediaAssets(userId, {
      mediaIds: [free1.id, used.id, free2.id],
    });

    expect(result.deleted.map((item) => item.id)).toEqual([free1.id, free2.id]);
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0]).toMatchObject({ id: used.id, reason: "in-use" });
    expect(result.blocked[0].usages[0]).toMatchObject({ area: "시설안내 사진" });

    // 지운 두 장은 파일까지 사라지고, 막힌 한 장은 기록과 파일이 모두 남는다.
    expect(await fileExists(publicPath(free1.storageKey))).toBe(false);
    expect(await fileExists(publicPath(free2.storageKey))).toBe(false);
    expect(await fileExists(publicPath(used.storageKey))).toBe(true);
    expect(await db.mediaAsset.count()).toBe(1);
    expect(await db.auditLog.count({ where: { action: "MEDIA_DELETE" } })).toBe(2);

    // 화면이 보여 주는 안내에 지운 수와 남긴 이유가 함께 들어간다.
    const message = describeMediaDeleteResult(result);
    expect(message).toContain("2장을 지웠습니다");
    expect(message).toContain("1장은 지우지 않고");
    expect(message).toContain("시설안내 사진");
  });

  test("기존 사이트 사진이 섞여 있으면 그 사진만 남긴다", async () => {
    const { cookie, userId } = await adminSession();
    const uploaded = await uploadOne(cookie, userId);
    await registerLegacyMediaAssets();
    const legacy = await db.mediaAsset.findFirstOrThrow({
      where: { source: "LEGACY" },
    });

    const result = await deleteMediaAssets(userId, {
      mediaIds: [uploaded.id, legacy.id],
    });

    expect(result.deleted.map((item) => item.id)).toEqual([uploaded.id]);
    expect(result.blocked[0]).toMatchObject({ id: legacy.id, reason: "legacy" });
    expect(describeMediaDeleteResult(result)).toContain("기존 사이트 사진");
    expect(await db.mediaAsset.count({ where: { id: legacy.id } })).toBe(1);
  });
});

describe("AD-015 숨기기", () => {
  test("기존 사이트 사진은 숨기기만 되고 다시 보이게 할 수 있다", async () => {
    const { userId } = await adminSession();
    await registerLegacyMediaAssets();
    const legacy = await db.mediaAsset.findFirstOrThrow({
      where: { source: "LEGACY" },
    });

    // 삭제는 막힌다 — 배포 환경은 커밋된 파일을 실행 중에 바꾸지 못한다.
    await expect(deleteMediaAsset(userId, { mediaId: legacy.id })).rejects.toThrow(
      MEDIA_MESSAGES.legacyDeleteBlocked,
    );

    await setMediaHidden(userId, { mediaId: legacy.id, hidden: true });

    const hiddenRow = await db.mediaAsset.findUniqueOrThrow({
      where: { id: legacy.id },
    });
    expect(hiddenRow.hiddenAt).not.toBeNull();
    expect(hiddenRow.hiddenByUserId).toBe(userId);

    // 기본 목록과 사진 고르기에서 빠지고, 「숨긴 사진」으로만 보인다.
    const visible = await listMediaAssets({
      page: 1,
      pageSize: 100,
      visibility: "visible",
    });
    const hiddenList = await listMediaAssets({
      page: 1,
      pageSize: 100,
      visibility: "hidden",
    });
    expect(visible.items.some((item) => item.id === legacy.id)).toBe(false);
    expect(hiddenList.items.map((item) => item.id)).toEqual([legacy.id]);
    expect(hiddenList.items[0].hidden).toBe(true);
    expect(visible.counts.hidden).toBe(1);
    expect((await listMediaOptions()).some((option) => option.id === legacy.id)).toBe(
      false,
    );

    await setMediaHidden(userId, { mediaId: legacy.id, hidden: false });

    const restored = await db.mediaAsset.findUniqueOrThrow({
      where: { id: legacy.id },
    });
    expect(restored.hiddenAt).toBeNull();
    expect(restored.hiddenByUserId).toBeNull();
    expect((await listMediaOptions()).some((option) => option.id === legacy.id)).toBe(
      true,
    );

    // 숨긴 사람과 되돌린 사람이 모두 기록에 남는다.
    const actions = await db.auditLog.findMany({
      where: { resourceId: legacy.id },
      orderBy: { createdAt: "asc" },
      select: { action: true, actorUserId: true },
    });
    expect(actions).toEqual([
      { action: "MEDIA_HIDE", actorUserId: userId },
      { action: "MEDIA_UNHIDE", actorUserId: userId },
    ]);
  });

  test("숨긴 사진은 화면에 새로 붙일 수 없다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId);
    await setMediaHidden(userId, { mediaId: media.id, hidden: true });

    try {
      await upsertFacilityPhoto(userId, {
        campusKey: "bundang",
        mediaId: media.id,
        caption: "",
        displayOrder: 1,
        isVisible: true,
      });
      throw new Error("오류가 나야 하는데 통과했습니다.");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      // 사진 고르기 상자에서 빠지지만, 주소를 직접 보내도 붙지 않게 서버가 막는다.
      expect((error as AppError).fieldErrors?.mediaId).toContain(MEDIA_MESSAGES.hidden);
    }

    expect(await db.facilityPhoto.count()).toBe(0);
  });

  test("같은 상태로 다시 눌러도 기록이 늘지 않는다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId);

    await setMediaHidden(userId, { mediaId: media.id, hidden: true });
    await setMediaHidden(userId, { mediaId: media.id, hidden: true });

    expect(await db.auditLog.count({ where: { action: "MEDIA_HIDE" } })).toBe(1);
  });

  test("숨긴 올린 사진은 그대로 지울 수 있다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId);
    await setMediaHidden(userId, { mediaId: media.id, hidden: true });

    const result = await deleteMediaAssets(userId, { mediaIds: [media.id] });

    expect(result.deleted).toHaveLength(1);
    expect(await db.mediaAsset.count()).toBe(0);
    expect(await fileExists(publicPath(media.storageKey))).toBe(false);
  });
});

describe("AD-015 삭제·숨기기 권한", () => {
  test("비로그인은 사진을 지울 수 없다", async () => {
    const response = await mediaDelete(
      makeRequest("DELETE", "/api/admin/media", {
        body: { mediaIds: ["any-media-id"] },
      }),
    );

    expect(response.status).toBe(401);
  });

  test("회원 계정은 사진을 지울 수 없다", async () => {
    const cookie = await memberCookie();

    const response = await mediaDelete(
      makeRequest("DELETE", "/api/admin/media", {
        cookie,
        body: { mediaIds: ["any-media-id"] },
      }),
    );

    expect(response.status).toBe(403);
  });

  test("비로그인·회원 계정은 사진을 숨길 수 없다", async () => {
    const anonymous = await mediaHide(
      makeRequest("POST", "/api/admin/media/hide", {
        body: { mediaId: "any-media-id", hidden: true },
      }),
    );
    expect(anonymous.status).toBe(401);

    const cookie = await memberCookie();
    const member = await mediaHide(
      makeRequest("POST", "/api/admin/media/hide", {
        cookie,
        body: { mediaId: "any-media-id", hidden: true },
      }),
    );
    expect(member.status).toBe(403);
  });

  test("관리자 요청은 지나가고 서비스 판단만 남는다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId);

    const hidden = await mediaHide(
      makeRequest("POST", "/api/admin/media/hide", {
        cookie,
        body: { mediaId: media.id, hidden: true },
      }),
    );
    expect(hidden.status).toBe(200);
    expect(await hidden.json()).toEqual({ hidden: true });

    const deleted = await mediaDelete(
      makeRequest("DELETE", "/api/admin/media", {
        cookie,
        body: { mediaIds: [media.id] },
      }),
    );
    expect(deleted.status).toBe(200);
    expect((await deleted.json()).deleted).toHaveLength(1);
    expect(await db.mediaAsset.count()).toBe(0);
  });
});

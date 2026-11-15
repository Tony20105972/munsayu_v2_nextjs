import { beforeEach, describe, expect, test } from "vitest";
import sharp from "sharp";
import { MEDIA_MESSAGES } from "@/lib/contracts";
import { getStorageAdapter, verifyUploadTicket } from "@/server/adapters/storage";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { LEGACY_MEDIA_REGISTRY } from "@/lib/legacy-media-registry";
import {
  createMediaUploadTicket,
  deleteMediaAsset,
  finalizeMediaUpload,
  findMediaUsages,
  listMediaAssets,
  registerLegacyMediaAssets,
  updateMediaAlt,
} from "@/server/services/media";
import {
  listAdminFacilityPhotos,
  listAdminHomeBanners,
  loadFacilityPhotoViews,
  loadHomeBannerViews,
  upsertFacilityPhoto,
  upsertHomeBanner,
} from "@/server/services/site-images";
import { createInstructor, updateInstructor } from "@/server/services/instructors";
import { upsertNotice } from "@/server/services/notices-admin";
import { PUT as directUploadPut } from "../../app/api/admin/media/direct-upload/route";
import { GET as uploadsGet } from "../../app/uploads/[...key]/route";
import { DEFAULT_HOME_BANNERS } from "@/lib/images";
import { adminCookie, memberCookie, resetDatabase } from "./helpers";

/**
 * AD-015 이미지 관리.
 *
 * 올리기는 「티켓 → 브라우저가 저장소로 직접 → 마무리 검사」 세 걸음이다. (ADR-008)
 * 여기서는 브라우저 대신 테스트가 직접 업로드 경로를 호출한다.
 * 쓰는 그림은 모두 테스트가 만든 것이고 실제 학원 사진이 아니다.
 */

const TEST_ORIGIN = "http://127.0.0.1";

beforeEach(async () => {
  await resetDatabase();
});

async function makeJpeg(width = 300, height = 200): Promise<Uint8Array> {
  return new Uint8Array(
    await sharp({
      create: { width, height, channels: 3, background: { r: 10, g: 60, b: 30 } },
    })
      .jpeg()
      .toBuffer(),
  );
}

/** 브라우저가 하는 일을 대신한다: 티켓을 받아 그 주소로 바이트를 올린다. */
async function putToStaging(
  cookie: string,
  bytes: Uint8Array,
  options: { sizeBytes?: number } = {},
): Promise<{ stagingKey: string; response: Response }> {
  const ticket = await createMediaUploadTicket({
    filename: "photo.jpg",
    sizeBytes: options.sizeBytes ?? bytes.byteLength,
  });

  const response = await directUploadPut(
    new Request(`${TEST_ORIGIN}${ticket.url}`, {
      method: "PUT",
      headers: { cookie, "content-type": "application/octet-stream" },
      body: bytes as unknown as BodyInit,
      // Node 의 fetch 구현은 본문이 있는 요청에 duplex 를 요구한다.
      duplex: "half",
    } as RequestInit & { duplex: "half" }),
  );

  return { stagingKey: ticket.stagingKey, response };
}

/** 세 걸음을 모두 거쳐 보관함에 한 장을 넣는다. */
async function uploadOne(
  cookie: string,
  adminUserId: string,
  bytes: Uint8Array,
  alt = "테스트 사진 설명",
) {
  const { stagingKey, response } = await putToStaging(cookie, bytes);
  expect(response.status).toBe(204);
  return finalizeMediaUpload(adminUserId, {
    stagingKey,
    filename: "photo.jpg",
    alt,
  });
}

async function adminSession(): Promise<{ cookie: string; userId: string }> {
  const cookie = await adminCookie();
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  return { cookie, userId: admin.id };
}

describe("AD-015 올리기 권한", () => {
  test("비로그인 요청은 올릴 수 없다", async () => {
    const ticket = await createMediaUploadTicket({
      filename: "photo.jpg",
      sizeBytes: 100,
    });

    const response = await directUploadPut(
      new Request(`${TEST_ORIGIN}${ticket.url}`, {
        method: "PUT",
        body: await makeJpeg(10, 10),
        duplex: "half",
      } as RequestInit & { duplex: "half" }),
    );

    expect(response.status).toBe(401);
  });

  test("회원 계정 요청은 올릴 수 없다", async () => {
    const cookie = await memberCookie();
    const { response } = await putToStaging(cookie, await makeJpeg(10, 10));

    expect(response.status).toBe(403);
  });

  test("서명이 틀린 티켓은 관리자라도 거부한다", async () => {
    const { cookie } = await adminSession();
    const ticket = await createMediaUploadTicket({
      filename: "photo.jpg",
      sizeBytes: 100,
    });

    const tampered = ticket.url.replace(/signature=[^&]+/, "signature=forged");
    const response = await directUploadPut(
      new Request(`${TEST_ORIGIN}${tampered}`, {
        method: "PUT",
        headers: { cookie },
        body: await makeJpeg(10, 10),
        duplex: "half",
      } as RequestInit & { duplex: "half" }),
    );

    expect(response.status).toBe(403);
  });

  test("만료된 티켓은 거부한다", () => {
    const expired = verifyUploadTicket({
      scope: "staging",
      key: "media-staging/abc",
      maxBytes: "100",
      expiresAt: "1",
      signature: "whatever",
      now: new Date(),
    });

    expect(expired).toBeNull();
  });
});

describe("AD-015 올린 파일 검사", () => {
  test("형식을 위장한 파일은 보관함에 들어가지 않는다", async () => {
    const { cookie, userId } = await adminSession();
    // 이름만 사진이고 내용은 사진이 아니다.
    const fake = new Uint8Array(Buffer.from("PK not really an image"));
    const { stagingKey } = await putToStaging(cookie, fake);

    await expect(
      finalizeMediaUpload(userId, { stagingKey, filename: "photo.jpg", alt: "설명" }),
    ).rejects.toBeInstanceOf(AppError);

    expect(await db.mediaAsset.count()).toBe(0);
    // 검사 전 원본은 실패해도 남겨 두지 않는다.
    await expect(getStorageAdapter().get("staging", stagingKey)).rejects.toThrow();
  });

  test("SVG 는 받지 않는다", async () => {
    const { cookie, userId } = await adminSession();
    const svg = new Uint8Array(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf8"),
    );
    const { stagingKey } = await putToStaging(cookie, svg);

    try {
      await finalizeMediaUpload(userId, {
        stagingKey,
        filename: "logo.svg",
        alt: "설명",
      });
      throw new Error("오류가 나야 하는데 통과했습니다.");
    } catch (error) {
      expect((error as AppError).fieldErrors?.image).toContain(
        MEDIA_MESSAGES.svgRejected,
      );
    }
  });

  test("용량 상한을 넘기면 티켓 단계에서 막는다", async () => {
    await adminSession();

    await expect(
      createMediaUploadTicket({ filename: "big.jpg", sizeBytes: 21 * 1024 * 1024 }),
    ).rejects.toBeInstanceOf(AppError);
  });

  test("브라우저가 크기를 작게 속여도 올리는 중에 끊는다", async () => {
    const { cookie } = await adminSession();
    // 관리자 설정으로 상한을 1MB 로 낮춘다.
    await db.appSetting.upsert({
      where: { key: "media.upload.maxBytes" },
      create: { key: "media.upload.maxBytes", value: String(1024 * 1024) },
      update: { value: String(1024 * 1024) },
    });

    // 2MB 짜리를 "1KB" 라고 알려 주고 올린다.
    const big = new Uint8Array(2 * 1024 * 1024);
    const { response } = await putToStaging(cookie, big, { sizeBytes: 1024 });

    expect(response.status).toBe(422);
    expect((await response.json()).fieldErrors.image[0]).toContain("MB 이하");
  });

  test("대체 텍스트가 없으면 보관함에 넣지 않는다", async () => {
    const { cookie, userId } = await adminSession();
    const { stagingKey } = await putToStaging(cookie, await makeJpeg());

    await expect(
      finalizeMediaUpload(userId, { stagingKey, filename: "photo.jpg", alt: "" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  test("올린 사진은 2000px 이하로 줄여 저장하고 감사 기록을 남긴다", async () => {
    const { cookie, userId } = await adminSession();

    const media = await uploadOne(cookie, userId, await makeJpeg(3000, 1500));

    expect(media.width).toBe(2000);
    expect(media.height).toBe(1000);
    expect(media.url.startsWith("/uploads/media/")).toBe(true);
    expect(media.alt).toBe("테스트 사진 설명");

    const log = await db.auditLog.findFirstOrThrow({
      where: { action: "MEDIA_UPLOAD" },
    });
    expect(log.actorUserId).toBe(userId);
    expect(log.resourceId).toBe(media.id);
    // 감사 기록에 파일 이름은 넣지 않는다. (AD-013)
    expect(log.filterSummary).not.toContain("photo.jpg");
  });

  test("저장한 사진은 공개 주소로 내려온다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId, await makeJpeg(200, 150));

    const key = media.url.replace("/uploads/", "");
    const response = await uploadsGet(new Request(`${TEST_ORIGIN}${media.url}`), {
      params: Promise.resolve({ key: key.split("/") }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  test("이미지가 아닌 확장자는 공개 주소로 내보내지 않는다", async () => {
    const response = await uploadsGet(
      new Request(`${TEST_ORIGIN}/uploads/media/whatever.pdf`),
      { params: Promise.resolve({ key: ["media", "whatever.pdf"] }) },
    );

    expect(response.status).toBe(404);
  });
});

describe("AD-015 보관함 목록·수정·삭제", () => {
  test("검색은 파일 이름과 대체 텍스트를 함께 본다", async () => {
    const { cookie, userId } = await adminSession();
    await uploadOne(cookie, userId, await makeJpeg(), "대치본원 1층 로비");
    await uploadOne(cookie, userId, await makeJpeg(), "분당점 북카페");

    const found = await listMediaAssets({
      page: 1,
      pageSize: 20,
      visibility: "visible",
      keyword: "북카페",
    });

    expect(found.total).toBe(1);
    expect(found.items[0].alt).toBe("분당점 북카페");
  });

  test("대체 텍스트를 고치면 기록이 남는다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId, await makeJpeg());

    await updateMediaAlt(userId, { mediaId: media.id, alt: "고친 설명" });

    const row = await db.mediaAsset.findUniqueOrThrow({ where: { id: media.id } });
    expect(row.alt).toBe("고친 설명");
    expect(
      await db.auditLog.count({ where: { action: "MEDIA_UPDATE" } }),
    ).toBeGreaterThanOrEqual(1);
  });

  test("쓰지 않는 사진은 파일까지 지운다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId, await makeJpeg());
    const row = await db.mediaAsset.findUniqueOrThrow({ where: { id: media.id } });

    const result = await deleteMediaAsset(userId, { mediaId: media.id });

    expect(result.removedFile).toBe(true);
    expect(await db.mediaAsset.count()).toBe(0);
    await expect(
      getStorageAdapter().get("public", row.storageKey ?? ""),
    ).rejects.toThrow();
    expect(await db.auditLog.count({ where: { action: "MEDIA_DELETE" } })).toBe(1);
  });

  test("강사 사진으로 쓰는 중이면 지울 수 없고 어디에 쓰는지 알려 준다", async () => {
    const { cookie, userId } = await adminSession();
    const media = await uploadOne(cookie, userId, await makeJpeg());

    await createInstructor(userId, {
      name: "가상강사X",
      profileCode: "tch-x",
      bio: null,
      photoMediaId: media.id,
    });

    try {
      await deleteMediaAsset(userId, { mediaId: media.id });
      throw new Error("오류가 나야 하는데 통과했습니다.");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(409);
      expect((error as AppError).message).toContain("강사 사진");
      expect((error as AppError).message).toContain("가상강사X");
    }

    expect(await db.mediaAsset.count()).toBe(1);
  });

  test("배너·시설 사진·공지 본문에서 쓰는 자리도 모두 찾는다", async () => {
    const { cookie, userId } = await adminSession();
    const bannerPhoto = await uploadOne(cookie, userId, await makeJpeg());
    const facilityPhoto = await uploadOne(cookie, userId, await makeJpeg());
    const noticePhoto = await uploadOne(cookie, userId, await makeJpeg());

    await upsertHomeBanner(userId, {
      mediaId: bannerPhoto.id,
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
    await upsertFacilityPhoto(userId, {
      campusKey: "daechi",
      mediaId: facilityPhoto.id,
      caption: "",
      displayOrder: 1,
      isVisible: true,
    });
    await upsertNotice({
      title: "사진이 들어간 공지",
      body: `<p><img src="${noticePhoto.url}" alt="본문 사진" /></p>`,
      isPinned: false,
      status: "PUBLISHED",
      publishedAt: new Date("2026-11-14T00:00:00.000Z"),
    });

    const usages = await findMediaUsages([bannerPhoto, facilityPhoto, noticePhoto]);

    expect(usages.get(bannerPhoto.id)?.[0]).toMatchObject({ area: "메인 배너" });
    expect(usages.get(facilityPhoto.id)?.[0]).toMatchObject({
      area: "시설안내 사진",
    });
    expect(usages.get(noticePhoto.id)?.[0]).toMatchObject({ area: "공지 본문" });

    // 세 자리 모두 삭제를 막는다.
    for (const media of [bannerPhoto, facilityPhoto, noticePhoto]) {
      await expect(deleteMediaAsset(userId, { mediaId: media.id })).rejects.toThrow();
    }
  });

  test("사용 여부로 걸러 볼 수 있다", async () => {
    const { cookie, userId } = await adminSession();
    const used = await uploadOne(cookie, userId, await makeJpeg());
    await uploadOne(cookie, userId, await makeJpeg());

    await upsertFacilityPhoto(userId, {
      campusKey: "bundang",
      mediaId: used.id,
      caption: "",
      displayOrder: 1,
      isVisible: true,
    });

    const usedList = await listMediaAssets({
      page: 1,
      pageSize: 20,
      visibility: "visible",
      usage: "used",
    });
    const unusedList = await listMediaAssets({
      page: 1,
      pageSize: 20,
      visibility: "visible",
      usage: "unused",
    });

    expect(usedList.total).toBe(1);
    expect(usedList.items[0].id).toBe(used.id);
    expect(unusedList.total).toBe(1);
  });
});

describe("AD-015 기존 사이트 사진 등록", () => {
  test("커밋된 사진을 보관함에 넣고 두 번 실행해도 늘어나지 않는다", async () => {
    const first = await registerLegacyMediaAssets();
    const second = await registerLegacyMediaAssets();

    expect(first.created).toBe(LEGACY_MEDIA_REGISTRY.length);
    expect(second.created).toBe(0);
    expect(await db.mediaAsset.count()).toBe(LEGACY_MEDIA_REGISTRY.length);
  });

  test("Unsplash 사진은 교체 권장으로 표시하고 권리 표시를 함께 보여 준다", async () => {
    await registerLegacyMediaAssets();

    const recommended = await db.mediaAsset.findMany({
      where: { replaceRecommended: true },
      select: { rightsNote: true },
    });

    expect(recommended.length).toBeGreaterThan(0);
    for (const row of recommended) {
      expect(row.rightsNote).toMatch(/Unsplash/i);
    }
  });

  test("기존 사이트 사진은 지울 수 없고 숨기기를 안내한다", async () => {
    const { userId } = await adminSession();
    await registerLegacyMediaAssets();
    const legacy = await db.mediaAsset.findFirstOrThrow({
      where: { source: "LEGACY" },
    });

    // 배포된 파일을 실행 중에 지울 수 없으므로 삭제가 아니라 숨기기로 처리한다.
    // 숨기기 동작 자체는 `ad-015-media-delete.test.ts` 에서 본다.
    await expect(deleteMediaAsset(userId, { mediaId: legacy.id })).rejects.toThrow(
      MEDIA_MESSAGES.legacyDeleteBlocked,
    );
    expect(await db.mediaAsset.count({ where: { source: "LEGACY" } })).toBe(
      LEGACY_MEDIA_REGISTRY.length,
    );
  });
});

describe("AD-015 화면 연결", () => {
  test("배너가 없으면 공개 홈이 기본 3장으로 그려진다", async () => {
    const banners = await loadHomeBannerViews();

    expect(banners).toEqual(DEFAULT_HOME_BANNERS);
  });

  test("배너를 등록하면 공개 홈이 그 값을 쓴다", async () => {
    const { cookie, userId } = await adminSession();
    const photo = await uploadOne(cookie, userId, await makeJpeg());

    await upsertHomeBanner(userId, {
      mediaId: photo.id,
      eyebrow: "NEW",
      headline: "바뀐 제목",
      body: "바뀐 설명",
      primaryLabel: "신청",
      primaryHref: "/sub/about",
      secondaryLabel: "",
      secondaryHref: "",
      displayOrder: 1,
      isVisible: true,
    });

    const banners = await loadHomeBannerViews();

    expect(banners).toHaveLength(1);
    expect(banners[0].headline).toBe("바뀐 제목");
    expect(banners[0].backgroundUrl).toBe(photo.url);
    // 문구만 있고 주소가 없는 버튼은 비워 둔다.
    expect(banners[0].secondaryLabel).toBe("");
  });

  test("숨긴 배너는 공개 홈에 나오지 않는다", async () => {
    const { userId } = await adminSession();
    await upsertHomeBanner(userId, {
      mediaId: null,
      eyebrow: "",
      headline: "보이는 배너",
      body: "",
      primaryLabel: "",
      primaryHref: "",
      secondaryLabel: "",
      secondaryHref: "",
      displayOrder: 1,
      isVisible: true,
    });
    await upsertHomeBanner(userId, {
      mediaId: null,
      eyebrow: "",
      headline: "숨긴 배너",
      body: "",
      primaryLabel: "",
      primaryHref: "",
      secondaryLabel: "",
      secondaryHref: "",
      displayOrder: 2,
      isVisible: false,
    });

    const banners = await loadHomeBannerViews();

    expect(banners.map((banner) => banner.headline)).toEqual(["보이는 배너"]);
    expect(await listAdminHomeBanners()).toHaveLength(2);
  });

  test("시설 사진이 없으면 지금 커밋된 사진으로 그려진다", async () => {
    const photos = await loadFacilityPhotoViews("daechi");

    expect(photos).toHaveLength(4);
    expect(photos[0].url).toBe("/images/facility/facility-01.jpg");
  });

  test("시설 사진을 등록하면 순서대로 공개 화면에 나온다", async () => {
    const { cookie, userId } = await adminSession();
    const second = await uploadOne(cookie, userId, await makeJpeg(), "두 번째");
    const first = await uploadOne(cookie, userId, await makeJpeg(), "첫 번째");

    await upsertFacilityPhoto(userId, {
      campusKey: "daechi",
      mediaId: second.id,
      caption: "두 번째 사진",
      displayOrder: 2,
      isVisible: true,
    });
    await upsertFacilityPhoto(userId, {
      campusKey: "daechi",
      mediaId: first.id,
      caption: "첫 번째 사진",
      displayOrder: 1,
      isVisible: true,
    });

    const photos = await loadFacilityPhotoViews("daechi");

    expect(photos.map((photo) => photo.caption)).toEqual([
      "첫 번째 사진",
      "두 번째 사진",
    ]);
    // 다른 지점에는 영향이 없다.
    expect(await loadFacilityPhotoViews("bundang")).toHaveLength(4);
    expect(await listAdminFacilityPhotos()).toHaveLength(2);
  });

  test("보관함에 없는 사진 id 로는 배너·시설 사진을 저장할 수 없다", async () => {
    const { userId } = await adminSession();

    await expect(
      upsertFacilityPhoto(userId, {
        campusKey: "daechi",
        mediaId: "no-such-media-id",
        caption: "",
        displayOrder: 1,
        isVisible: true,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  test("강사 사진을 바꾸거나 빼면 기록이 남는다", async () => {
    const { cookie, userId } = await adminSession();
    const photo = await uploadOne(cookie, userId, await makeJpeg());

    const instructor = await createInstructor(userId, {
      name: "가상강사Y",
      profileCode: "tch-y",
      bio: null,
      photoMediaId: null,
    });

    await updateInstructor(userId, instructor.id, {
      name: "가상강사Y",
      profileCode: "tch-y",
      bio: null,
      photoMediaId: photo.id,
    });
    await updateInstructor(userId, instructor.id, {
      name: "가상강사Y",
      profileCode: "tch-y",
      bio: null,
      photoMediaId: null,
    });

    const logs = await db.auditLog.findMany({
      where: { action: "MEDIA_UPDATE", resourceType: "Instructor" },
      orderBy: { createdAt: "asc" },
    });

    expect(logs).toHaveLength(2);
    expect(logs[0].filterSummary).toBe(`mediaId=${photo.id}`);
    expect(logs[1].filterSummary).toBe("mediaId=none");
  });
});

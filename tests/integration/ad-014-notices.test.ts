import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { getNotice, listNotices } from "@/server/services/notices";
import {
  addNoticeAttachment,
  deleteNotices,
  getAdminNotice,
  listAdminNotices,
  upsertNotice,
} from "@/server/services/notices-admin";
import { GET as adminNoticesGet } from "../../app/api/admin/notices/route";
import { GET as publicNoticesGet } from "../../app/api/notices/route";
import { GET as publicNoticeGet } from "../../app/api/notices/[id]/route";
import {
  adminCookie,
  makeRequest,
  memberCookie,
  resetDatabase,
  routeContext,
} from "./helpers";

/**
 * AD-014 공지사항 관리.
 *
 * 레거시 게시판은 `notice` 하나뿐이라 공지사항 단일 게시판으로 만든다. (EV-ADM-10/11) // ASM-089
 * 본문 HTML 은 저장 전에 허용 목록으로 정리하고, 임시 저장 글은 공개 화면에 나오지 않는다.
 */

beforeEach(async () => {
  await resetDatabase();
});

const PUBLISHED_AT = new Date("2026-11-01T00:00:00.000Z");

describe("AD-014 공지 작성과 공개 노출", () => {
  test("AD-014 정상: 게시한 글은 공개 목록·상세에 나온다", async () => {
    const { id } = await upsertNotice({
      title: "추가 설명회 긴급 편성",
      body: "<p>설명회를 추가로 엽니다.</p>",
      isPinned: false,
      status: "PUBLISHED",
      publishedAt: PUBLISHED_AT,
    });

    const list = await listNotices();
    expect(list.total).toBe(1);

    const detail = await getNotice(id);
    expect(detail.title).toBe("추가 설명회 긴급 편성");
    expect(detail.body).toContain("<p>설명회를 추가로 엽니다.</p>");
  });

  test("AD-014 임시 저장 글은 공개되지 않는다", async () => {
    const { id } = await upsertNotice({
      title: "작성 중인 공지",
      body: "<p>아직 공개하지 않습니다.</p>",
      isPinned: false,
      status: "DRAFT",
      publishedAt: PUBLISHED_AT,
    });

    const list = await listNotices();
    expect(list.total).toBe(0);
    await expect(getNotice(id)).rejects.toBeInstanceOf(AppError);

    // 관리자 목록에서는 보인다.
    const adminList = await listAdminNotices({ page: 1, pageSize: 20 });
    expect(adminList.total).toBe(1);
    expect(adminList.items[0].status).toBe("DRAFT");
  });

  test("AD-014 게시 상태인데 시각을 비우면 지금 시각으로 게시한다", async () => {
    const now = new Date("2026-11-12T05:00:00.000Z");
    const { id } = await upsertNotice(
      {
        title: "시각 없이 게시",
        body: "<p>내용</p>",
        isPinned: false,
        status: "PUBLISHED",
        publishedAt: null,
      },
      now,
    );

    const saved = await db.notice.findUniqueOrThrow({ where: { id } });
    expect(saved.publishedAt?.toISOString()).toBe(now.toISOString());
  });

  test("AD-014 고정 글이 목록 맨 위에 온다", async () => {
    await upsertNotice({
      title: "보통 글",
      body: "<p>보통</p>",
      isPinned: false,
      status: "PUBLISHED",
      publishedAt: new Date("2026-11-05T00:00:00.000Z"),
    });
    await upsertNotice({
      title: "고정 글",
      body: "<p>고정</p>",
      isPinned: true,
      status: "PUBLISHED",
      publishedAt: new Date("2026-10-01T00:00:00.000Z"),
    });

    const list = await listNotices();
    expect(list.items[0].title).toBe("고정 글");
  });
});

describe("AD-014 XSS 방어", () => {
  test("AD-014 본문의 script 와 이벤트 속성은 저장되지 않는다", async () => {
    const { id } = await upsertNotice({
      title: "위험한 글",
      body:
        '<p onclick="steal()">안내</p><script>alert("xss")</script>' +
        '<a href="javascript:alert(1)">링크</a><iframe src="https://evil.test"></iframe>',
      isPinned: false,
      status: "PUBLISHED",
      publishedAt: PUBLISHED_AT,
    });

    const saved = await db.notice.findUniqueOrThrow({ where: { id } });
    expect(saved.body).not.toMatch(/script|onclick|javascript:|iframe/i);
    expect(saved.body).toContain("안내");

    // 공개 화면으로 내보낼 때도 같은 기준을 쓴다.
    const detail = await getNotice(id);
    expect(detail.body).not.toMatch(/script|onclick|javascript:|iframe/i);
  });

  test("AD-014 DB 에 직접 넣은 위험한 본문도 화면에 내보낼 때 걸러진다", async () => {
    // 정리기를 거치지 않고 들어온 값(예: 직접 SQL)도 출력 경로에서 막아야 한다.
    const notice = await db.notice.create({
      data: {
        title: "직접 넣은 글",
        body: '<p>본문</p><img src="x" onerror="alert(1)">',
        status: "PUBLISHED",
        publishedAt: PUBLISHED_AT,
      },
    });

    const detail = await getNotice(notice.id);
    expect(detail.body).not.toContain("onerror");
  });

  /*
   * 본문 이미지 업로드는 AD-015 공통 업로드로 옮겼다.
   * SVG 거부·형식 위장·크기 줄이기·EXIF 제거는 `tests/unit/image-pipeline.test.ts` 와
   * `tests/integration/ad-015-media.test.ts` 에서 확인한다.
   */
});

describe("AD-014 첨부파일", () => {
  test("허용 형식은 붙고 공개 상세에 나온다", async () => {
    const { id } = await upsertNotice({
      title: "첨부가 있는 공지",
      body: "<p>내용</p>",
      isPinned: false,
      status: "PUBLISHED",
      publishedAt: PUBLISHED_AT,
    });

    await addNoticeAttachment(id, {
      filename: "안내문.pdf",
      bytes: new Uint8Array(Buffer.from("%PDF-1.7\n안내", "utf8")),
    });

    const detail = await getNotice(id);
    expect(detail.attachments).toHaveLength(1);
    expect(detail.attachments[0].filename).toBe("안내문.pdf");
  });

  test("허용하지 않는 형식은 붙지 않는다", async () => {
    const { id } = await upsertNotice({
      title: "공지",
      body: "<p>내용</p>",
      isPinned: false,
      status: "DRAFT",
      publishedAt: null,
    });

    await expect(
      addNoticeAttachment(id, {
        filename: "run.sh",
        bytes: new Uint8Array(Buffer.from("#!/bin/sh\n", "utf8")),
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  test("글을 지우면 첨부 행도 함께 사라진다", async () => {
    const { id } = await upsertNotice({
      title: "지울 공지",
      body: "<p>내용</p>",
      isPinned: false,
      status: "DRAFT",
      publishedAt: null,
    });
    await addNoticeAttachment(id, {
      filename: "안내문.pdf",
      bytes: new Uint8Array(Buffer.from("%PDF-1.7\n안내", "utf8")),
    });

    const result = await deleteNotices({ noticeIds: [id] });
    expect(result.deleted).toBe(1);
    expect(result.removedFiles).toBe(1);
    expect(await db.noticeAttachment.count()).toBe(0);
  });
});

describe("AD-014 레거시 글 번호 호환", () => {
  test("RT-001 /notice/{wr_id} 가 가져온 글로 이어진다", async () => {
    const notice = await db.notice.create({
      data: {
        legacyWrId: 2,
        title: "추가 설명회 긴급 편성(전타임 마감)",
        body: "<p>레거시에서 가져온 글</p>",
        status: "PUBLISHED",
        publishedAt: PUBLISHED_AT,
      },
    });

    // 레거시 주소 `/bbs/board.php?bo_table=notice&wr_id=2` 는 308 로 `/notice/2` 가 된다.
    const detail = await getNotice("2");
    expect(detail.id).toBe(notice.id);
    expect(detail.legacyWrId).toBe(2);

    // 새 글의 id 로도 찾을 수 있다.
    expect((await getNotice(notice.id)).id).toBe(notice.id);
  });

  test("가져오기를 다시 해도 같은 글 번호는 늘어나지 않는다", async () => {
    // 스크립트는 `legacyWrId` 유일 제약으로 같은 글을 알아본다.
    await db.notice.create({
      data: {
        legacyWrId: 1,
        title: "첫 글",
        body: "<p>내용</p>",
        status: "PUBLISHED",
        publishedAt: PUBLISHED_AT,
      },
    });

    const existing = await db.notice.findUnique({ where: { legacyWrId: 1 } });
    expect(existing).not.toBeNull();

    await db.notice.update({
      where: { id: existing!.id },
      data: { title: "첫 글 (수정됨)" },
    });

    expect(await db.notice.count()).toBe(1);
    expect(
      (await db.notice.findUniqueOrThrow({ where: { legacyWrId: 1 } })).title,
    ).toBe("첫 글 (수정됨)");
  });
});

describe("AD-014 권한", () => {
  test("비로그인은 관리자 공지 목록을 볼 수 없다", async () => {
    const response = await adminNoticesGet(makeRequest("GET", "/api/admin/notices"));
    expect(response.status).toBe(401);
  });

  test("회원 세션으로는 관리자 공지 목록을 볼 수 없다", async () => {
    const cookie = await memberCookie();
    const response = await adminNoticesGet(
      makeRequest("GET", "/api/admin/notices", { cookie }),
    );
    expect(response.status).toBe(403);
  });

  test("관리자는 임시 저장 글까지 본다", async () => {
    await upsertNotice({
      title: "임시 글",
      body: "<p>내용</p>",
      isPinned: false,
      status: "DRAFT",
      publishedAt: null,
    });
    const cookie = await adminCookie();

    const response = await adminNoticesGet(
      makeRequest("GET", "/api/admin/notices", { cookie }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).total).toBe(1);

    // 공개 경로에서는 보이지 않는다.
    const publicList = await publicNoticesGet(makeRequest("GET", "/api/notices"));
    expect((await publicList.json()).total).toBe(0);
  });

  test("없는 공지는 공개 상세에서 404 다", async () => {
    const response = await publicNoticeGet(
      makeRequest("GET", "/api/notices/missing-id"),
      routeContext({ id: "missing-id" }),
    );
    expect(response.status).toBe(404);
  });

  test("관리자 상세 조회는 임시 저장 글도 읽는다", async () => {
    const { id } = await upsertNotice({
      title: "임시 글",
      body: "<p>내용</p>",
      isPinned: false,
      status: "DRAFT",
      publishedAt: null,
    });

    const detail = await getAdminNotice(id);
    expect(detail.status).toBe("DRAFT");
  });
});

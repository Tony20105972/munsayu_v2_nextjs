import { beforeEach, describe, expect, test } from "vitest";
import { db } from "@/server/db";
import { GET as noticesList } from "../../app/api/notices/route";
import { GET as noticeDetail } from "../../app/api/notices/[id]/route";
import { makeRequest, resetDatabase, routeContext } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

describe("PG-012 공지", () => {
  test("PG-012 공지 목록: 고정 글이 먼저, 그다음 최신순이다", async () => {
    await db.notice.create({
      data: {
        title: "일반 공지(과거)",
        body: "본문",
        isPinned: false,
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    await db.notice.create({
      data: {
        title: "일반 공지(최근)",
        body: "본문",
        isPinned: false,
        publishedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    });
    await db.notice.create({
      data: {
        title: "고정 공지",
        body: "본문",
        isPinned: true,
        publishedAt: new Date("2025-01-01T00:00:00.000Z"),
      },
    });

    const response = await noticesList(makeRequest("GET", "/api/notices"));
    expect(response.status).toBe(200);

    const titles = (await response.json()).items.map(
      (item: { title: string }) => item.title,
    );
    expect(titles).toEqual(["고정 공지", "일반 공지(최근)", "일반 공지(과거)"]);
  });

  test("PG-012 공지 목록: 게시 시각이 없거나 미래인 글은 보이지 않는다", async () => {
    await db.notice.create({ data: { title: "작성 중", body: "본문" } });
    await db.notice.create({
      data: {
        title: "예약 공지",
        body: "본문",
        publishedAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });

    const response = await noticesList(makeRequest("GET", "/api/notices"));
    expect((await response.json()).items).toHaveLength(0);
  });

  test("PG-012 공지 목록: page·pageSize로 나눠 돌려준다", async () => {
    for (let index = 0; index < 3; index += 1) {
      await db.notice.create({
        data: {
          title: `공지 ${index}`,
          body: "본문",
          publishedAt: new Date(`2026-0${index + 1}-01T00:00:00.000Z`),
        },
      });
    }

    const first = await noticesList(
      makeRequest("GET", "/api/notices?page=1&pageSize=2"),
    );
    const firstBody = await first.json();
    expect(firstBody.total).toBe(3);
    expect(firstBody.page).toBe(1);
    expect(firstBody.pageSize).toBe(2);
    expect(firstBody.items).toHaveLength(2);
    expect(firstBody.items[0].title).toBe("공지 2");

    const second = await noticesList(
      makeRequest("GET", "/api/notices?page=2&pageSize=2"),
    );
    const secondBody = await second.json();
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.items[0].title).toBe("공지 0");
  });

  test("PG-012 공지 상세: 공개된 글은 본문을 돌려주고 비공개 글은 404", async () => {
    const published = await db.notice.create({
      data: {
        title: "공개 공지",
        body: "공개 본문",
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    const draft = await db.notice.create({ data: { title: "작성 중", body: "본문" } });

    const ok = await noticeDetail(
      makeRequest("GET", `/api/notices/${published.id}`),
      routeContext({ id: published.id }),
    );
    expect(ok.status).toBe(200);
    expect((await ok.json()).body).toBe("공개 본문");

    const hidden = await noticeDetail(
      makeRequest("GET", `/api/notices/${draft.id}`),
      routeContext({ id: draft.id }),
    );
    expect(hidden.status).toBe(404);
  });
});

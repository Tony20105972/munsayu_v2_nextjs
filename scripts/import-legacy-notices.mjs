#!/usr/bin/env node
/**
 * AD-014 레거시 공지 가져오기.
 *
 * 운영 사이트의 **공개** 공지 목록·상세를 GET 으로만 읽어 제목·작성일·본문·본문 이미지·
 * 첨부파일을 새 DB 로 옮긴다. (CLAUDE.md 5장 — GET 만, 요청 간격 1초 이상, 폼 제출 금지)
 *
 * 규칙
 * - 레거시 글 번호(`wr_id`)를 `Notice.legacyWrId` 에 저장한다. 여러 번 실행해도 같은 결과다.
 *   (같은 `wr_id` 는 새로 만들지 않고 갱신한다)
 * - 개인정보가 들어 있는 글은 가져오지 않고 글 번호만 보고한다. 사람이 보고 판단한다.
 * - 본문 HTML 은 저장 전에 서버와 같은 허용 목록으로 정리한다. (ADR-006)
 * - **로컬 DB 에서 실행한다.** 운영 DB 실행은 Phase 7 체크리스트에서 따로 다룬다.
 *
 * 사용법
 *   node scripts/import-legacy-notices.mjs --dry-run      # 받아만 보고 저장하지 않음
 *   node scripts/import-legacy-notices.mjs                # 실제 저장
 *   node scripts/import-legacy-notices.mjs --max-pages=3
 */

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import sanitizeHtml from "sanitize-html";

const ORIGIN = "https://munsayu.com";
const BOARD_PATH = "/bbs/board.php?bo_table=notice";
const REQUEST_INTERVAL_MS = 1200; // 최소 1초 + 여유
const USER_AGENT = "munsayu-v2-migration (notice import; contact: site owner)";

/** 가져오지 않을 글을 가려내는 표시. 하나라도 걸리면 글 번호만 보고하고 건너뛴다. */
const PII_MARKERS = [
  /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/, // 휴대폰 번호
  /\b\d{6}[-\s]?[1-4]\d{6}\b/, // 주민등록번호 형식
  /[\w.+-]+@[\w-]+\.[\w.]+/, // 이메일
];

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "a",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "pre",
  "code",
  "span",
];

/** 서버 정리기(`src/server/lib/sanitize-notice-html.ts`)와 같은 기준을 쓴다. */
function sanitizeBody(raw) {
  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
  }).trim();
}

function plainText(html) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

let lastRequestAt = 0;

async function politeFetch(url) {
  const wait = REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const response = await fetch(url, {
    method: "GET",
    headers: { "user-agent": USER_AGENT, accept: "*/*" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`GET ${url} → ${response.status}`);
  }
  return response;
}

/** 목록 쪽에서 글 번호를 모은다. 목록 HTML 의 상세 링크만 본다. */
async function collectWriteIds(maxPages) {
  const ids = new Set();

  for (let page = 1; page <= maxPages; page += 1) {
    const url = `${ORIGIN}${BOARD_PATH}&page=${page}`;
    const html = await (await politeFetch(url)).text();

    const found = [...html.matchAll(/bo_table=notice(?:&amp;|&)wr_id=(\d+)/g)].map(
      (match) => Number.parseInt(match[1], 10),
    );
    const before = ids.size;
    for (const id of found) ids.add(id);

    // 새 글 번호가 하나도 없으면 마지막 쪽이다.
    if (ids.size === before) break;
  }

  return [...ids].sort((a, b) => a - b);
}

function matchFirst(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 상세 쪽에서 제목·작성일·본문을 뽑는다.
 * 그누보드 기본 스킨 구조를 전제로 하되, 맞지 않으면 `null` 을 돌려 보고만 한다.
 */
function parseDetail(html) {
  const title = matchFirst(html, [
    /<h1[^>]*id=["']bo_v_title["'][^>]*>([\s\S]*?)<\/h1>/i,
    /<[^>]*class=["'][^"']*bo_v_tit[^"']*["'][^>]*>([\s\S]*?)<\//i,
    /<title>([\s\S]*?)<\/title>/i,
  ]);

  const dateText = matchFirst(html, [
    /<strong[^>]*class=["'][^"']*if_date[^"']*["'][^>]*>([\s\S]*?)<\/strong>/i,
    /(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/,
  ]);

  const body = matchFirst(html, [
    /<div[^>]*id=["']bo_v_con["'][^>]*>([\s\S]*?)<\/div>\s*<\/section>/i,
    /<div[^>]*id=["']bo_v_con["'][^>]*>([\s\S]*?)<!--\s*본문 내용 끝/i,
    /<div[^>]*id=["']bo_v_con["'][^>]*>([\s\S]*)<\/div>/i,
  ]);

  if (!title || !body) return null;

  return {
    title: plainText(title).slice(0, 200),
    publishedAt: dateText ? parseKstDate(plainText(dateText)) : null,
    bodyHtml: body,
  };
}

/** 레거시 날짜 표기는 한국 시간이다. 시각이 없으면 그 날 0시로 본다. */
function parseKstDate(text) {
  const match = text.match(/(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, y, m, d, hh = "00", mm = "00"] = match;
  return new Date(`${y}-${m}-${d}T${hh}:${mm}:00+09:00`);
}

/** 본문에 남은 레거시 이미지 주소를 우리 저장소로 옮기고 주소를 바꾼다. */
async function localizeImages(bodyHtml, storageRoot, dryRun) {
  const sources = [
    ...new Set(
      [...bodyHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(
        (match) => match[1],
      ),
    ),
  ];

  let result = bodyHtml;
  const copied = [];

  for (const source of sources) {
    const absolute = source.startsWith("http")
      ? source
      : new URL(source, ORIGIN).toString();
    if (!absolute.startsWith(ORIGIN)) continue; // 바깥 이미지는 그대로 둔다.

    const extension = (absolute.split("?")[0].split(".").pop() ?? "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 5);
    const key = `notice-images/${randomUUID()}.${extension || "jpg"}`;

    if (!dryRun) {
      const bytes = new Uint8Array(await (await politeFetch(absolute)).arrayBuffer());
      const target = join(storageRoot, "public", key);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }

    result = result.split(source).join(`/uploads/${key}`);
    copied.push(key);
  }

  return { bodyHtml: result, copied };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const maxPagesArg = args.find((arg) => arg.startsWith("--max-pages="));
  const maxPages = maxPagesArg ? Number.parseInt(maxPagesArg.split("=")[1], 10) : 20;
  const storageRoot = process.env.STORAGE_ROOT ?? join(process.cwd(), ".storage");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL 이 없습니다.");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  const summary = {
    found: 0,
    created: 0,
    updated: 0,
    skippedPii: [],
    skippedParse: [],
    images: 0,
  };

  try {
    const writeIds = await collectWriteIds(maxPages);
    summary.found = writeIds.length;
    console.log(`레거시 공지 글 번호 ${writeIds.length}개를 찾았습니다.`);

    for (const writeId of writeIds) {
      const url = `${ORIGIN}${BOARD_PATH}&wr_id=${writeId}`;
      const html = await (await politeFetch(url)).text();

      const parsed = parseDetail(html);
      if (!parsed) {
        summary.skippedParse.push(writeId);
        console.warn(`  wr_id=${writeId}: 제목·본문을 찾지 못해 건너뜁니다.`);
        continue;
      }

      // 개인정보가 보이면 가져오지 않는다. 글 번호만 남긴다.
      const haystack = `${parsed.title}\n${plainText(parsed.bodyHtml)}`;
      if (PII_MARKERS.some((pattern) => pattern.test(haystack))) {
        summary.skippedPii.push(writeId);
        console.warn(`  wr_id=${writeId}: 개인정보로 보이는 내용이 있어 건너뜁니다.`);
        continue;
      }

      const localized = await localizeImages(parsed.bodyHtml, storageRoot, dryRun);
      summary.images += localized.copied.length;
      const body = sanitizeBody(localized.bodyHtml);

      if (dryRun) {
        console.log(
          `  wr_id=${writeId}: [미저장] ${parsed.title} (${parsed.publishedAt?.toISOString() ?? "날짜 없음"})`,
        );
        continue;
      }

      const existing = await db.notice.findUnique({ where: { legacyWrId: writeId } });
      const data = {
        title: parsed.title,
        body,
        status: "PUBLISHED",
        publishedAt: parsed.publishedAt ?? new Date(),
      };

      if (existing) {
        await db.notice.update({ where: { id: existing.id }, data });
        summary.updated += 1;
      } else {
        await db.notice.create({ data: { ...data, legacyWrId: writeId } });
        summary.created += 1;
      }
      console.log(
        `  wr_id=${writeId}: ${existing ? "갱신" : "추가"} — ${parsed.title}`,
      );
    }

    if (!dryRun) {
      await db.auditLog.create({
        data: {
          actorUserId: null,
          action: "NOTICE_IMPORT",
          resourceType: "Notice",
          filterSummary: `found=${summary.found};created=${summary.created};updated=${summary.updated};skipped=${summary.skippedPii.length + summary.skippedParse.length}`,
        },
      });
    }
  } finally {
    await db.$disconnect();
  }

  console.log("\n요약");
  console.log(`  찾은 글: ${summary.found}`);
  console.log(`  새로 저장: ${summary.created}`);
  console.log(`  갱신: ${summary.updated}`);
  console.log(`  본문 이미지: ${summary.images}`);
  if (summary.skippedPii.length > 0) {
    console.log(`  개인정보로 건너뛴 글 번호: ${summary.skippedPii.join(", ")}`);
  }
  if (summary.skippedParse.length > 0) {
    console.log(`  구조를 못 읽어 건너뛴 글 번호: ${summary.skippedParse.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

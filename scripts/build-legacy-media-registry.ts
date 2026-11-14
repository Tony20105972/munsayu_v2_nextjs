/**
 * AD-015 — 레거시 커밋 이미지 등록부를 만든다.
 *
 * `public/images/` 아래의 파일을 읽어 크기·형식을 재고, `docs/legacy/legacy-assets.json`
 * 의 권리 표시를 짝지어 `src/lib/legacy-media-registry.ts` 로 쓴다.
 *
 * 왜 생성해서 커밋하나:
 * 보관함 등록은 운영 함수에서도 돌아야 하는데, 함수 번들에 `public/` 이 들어온다는
 * 보장이 없다. 파일을 읽는 일을 작성 시점에 끝내 두면 등록은 DB 작업만 남는다. (ADR-008)
 *
 * 실행: `npm run build:media-registry`
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import sharp from "sharp";
import {
  ABOUT_INTRO_PHOTO,
  FACILITY_FEATURE_PHOTOS,
  FACILITY_SLIDE_PHOTOS,
  HOME_HERO_BACKGROUNDS,
  INSTRUCTOR_PHOTOS,
  INSTRUCTOR_PHOTO_KEY_BY_NAME,
  LOGO_IMAGE,
  SUB_HERO_BACKGROUND,
} from "../src/lib/images";

const ROOT = new URL("..", import.meta.url).pathname;
const IMAGE_DIR = join(ROOT, "public", "images");
const OUT_FILE = join(ROOT, "src", "lib", "legacy-media-registry.ts");
const ASSET_LEDGER = join(ROOT, "docs", "legacy", "legacy-assets.json");

type LedgerAsset = { committedPath?: string; rights?: string; note?: string };

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/** 강사 사진 키 → 레거시 강사 이름. `alt` 를 만드는 데 쓴다. */
const INSTRUCTOR_NAME_BY_KEY = new Map(
  Object.entries(INSTRUCTOR_PHOTO_KEY_BY_NAME).map(([name, key]) => [key, name]),
);

/** 시설 갤러리 사진의 지점. `alt` 에 지점 이름을 넣는다. */
const FACILITY_CAMPUS_BY_SRC = new Map<string, { campus: string; index: number }>();
for (const [campusKey, photos] of Object.entries(FACILITY_SLIDE_PHOTOS)) {
  const campus = campusKey === "daechi" ? "대치본원" : "분당점";
  photos.forEach((photo, index) => {
    FACILITY_CAMPUS_BY_SRC.set(photo.src, { campus, index: index + 1 });
  });
}

const FEATURE_ALT_BY_SRC = new Map<string, string>();
for (const photo of Object.values(FACILITY_FEATURE_PHOTOS)) {
  if (photo) FEATURE_ALT_BY_SRC.set(photo.src, photo.alt);
}

const HOME_SLIDE_INDEX = new Map<string, number>(
  HOME_HERO_BACKGROUNDS.map((src, index) => [src, index + 1]),
);

const INSTRUCTOR_KEY_BY_SRC = new Map(
  Object.entries(INSTRUCTOR_PHOTOS).map(([key, src]) => [src, key]),
);

/**
 * 화면에서 쓰는 `alt` 를 그대로 옮긴다. 레거시가 빈 `alt` 로 쓴 장식용 사진은
 * 보관함에서 알아볼 수 있는 이름을 붙인다(보관함은 빈 대체 텍스트를 받지 않는다).
 */
function altFor(url: string): string {
  if (url === LOGO_IMAGE.src) return LOGO_IMAGE.alt;
  if (url === SUB_HERO_BACKGROUND) return "하위 페이지 상단 배경 사진";
  if (url === ABOUT_INTRO_PHOTO.src) return ABOUT_INTRO_PHOTO.alt;

  const slide = HOME_SLIDE_INDEX.get(url);
  if (slide) return `메인 배너 배경 ${slide}`;

  const feature = FEATURE_ALT_BY_SRC.get(url);
  if (feature) return feature;

  const facility = FACILITY_CAMPUS_BY_SRC.get(url);
  if (facility) return `${facility.campus} 시설 사진 ${facility.index}`;

  const instructorKey = INSTRUCTOR_KEY_BY_SRC.get(url);
  if (instructorKey) {
    const name = INSTRUCTOR_NAME_BY_KEY.get(instructorKey);
    return name ? `${name} 사진` : `강사 사진 (${instructorKey})`;
  }

  return `기존 사이트 사진 (${url.split("/").pop()})`;
}

async function collect(dir: string, acc: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collect(full, acc);
    else acc.push(full);
  }
  return acc;
}

async function main(): Promise<void> {
  const ledger = JSON.parse(await readFile(ASSET_LEDGER, "utf8")) as {
    assets: LedgerAsset[];
  };
  const rightsByPath = new Map<string, string>();
  for (const asset of ledger.assets) {
    if (!asset.committedPath) continue;
    const note = [asset.rights, asset.note].filter(Boolean).join(" · ");
    rightsByPath.set(asset.committedPath, note);
  }

  const files = (await collect(IMAGE_DIR)).sort();
  const entries: string[] = [];

  for (const file of files) {
    const repoPath = relative(ROOT, file).replaceAll("\\", "/");
    const url = `/${relative(join(ROOT, "public"), file).replaceAll("\\", "/")}`;
    const extension = (url.split(".").pop() ?? "").toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) {
      console.warn(`형식을 모르는 파일은 건너뜁니다: ${repoPath}`);
      continue;
    }

    const bytes = await readFile(file);
    const metadata = await sharp(bytes).metadata();
    const rights =
      rightsByPath.get(repoPath) ?? "레거시 수집본 (legacy-assets.json 미등재)";

    entries.push(
      [
        "  {",
        `    url: ${JSON.stringify(url)},`,
        `    filename: ${JSON.stringify(url.split("/").pop())},`,
        `    alt: ${JSON.stringify(altFor(url))},`,
        `    contentType: ${JSON.stringify(contentType)},`,
        `    sizeBytes: ${bytes.byteLength},`,
        `    width: ${metadata.width ?? 0},`,
        `    height: ${metadata.height ?? 0},`,
        `    rightsNote: ${JSON.stringify(rights)},`,
        // 권리 출처가 학원 귀속으로 확정되지 않은 사진만 교체를 권한다. (D6)
        `    replaceRecommended: ${/unsplash/i.test(rights)},`,
        "  },",
      ].join("\n"),
    );
  }

  const file = `/**
 * AD-015 레거시 커밋 이미지 등록부 — **생성 파일이다. 직접 고치지 않는다.**
 *
 * 만드는 명령: \`npm run build:media-registry\`
 * 만드는 코드: \`scripts/build-legacy-media-registry.ts\`
 *
 * \`public/images/\` 아래 파일을 보관함(\`MediaAsset\`)에 등록할 때 쓴다.
 * 권리 표시는 \`docs/legacy/legacy-assets.json\` 에서 옮겨 왔다. (D6)
 * "Unsplash" 표시가 붙은 사진은 \`replaceRecommended\` 가 \`true\` 이고,
 * 관리자 화면에서 「교체 권장」으로 보인다.
 */

export type LegacyMediaEntry = {
  url: string;
  filename: string;
  alt: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  rightsNote: string;
  replaceRecommended: boolean;
};

export const LEGACY_MEDIA_REGISTRY: readonly LegacyMediaEntry[] = [
${entries.join("\n")}
];
`;

  await writeFile(OUT_FILE, file, "utf8");
  console.log(`${entries.length}개 항목을 ${relative(ROOT, OUT_FILE)} 에 썼습니다.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

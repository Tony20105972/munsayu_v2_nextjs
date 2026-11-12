#!/usr/bin/env node
/**
 * public/ 아래 자산의 크기를 검사한다.
 *
 * 레거시에서 받은 강사 사진 원본이 23MB·16MB였고, 그대로 커밋하면 저장소 이력에
 * 영구히 남는다. 사용자 결정(2026-11-11)에 따라 1MB를 넘는 이미지는 긴 변 2000px로
 * 줄여서 커밋하고, 이 검사로 큰 파일이 다시 들어오는 것을 막는다.
 * 형식 변환(WebP·AVIF)과 추가 최적화는 Phase 6 범위다.
 */
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TARGET_DIR = join(ROOT, "public");
const MAX_BYTES = 2 * 1024 * 1024;

async function collect(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return acc;
    throw error;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collect(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = await collect(TARGET_DIR);
const sized = await Promise.all(
  files.map(async (file) => ({ file, bytes: (await stat(file)).size })),
);
const tooBig = sized.filter((entry) => entry.bytes > MAX_BYTES);
const total = sized.reduce((sum, entry) => sum + entry.bytes, 0);

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;
console.log(
  `public/ 파일 ${sized.length}개, 합계 ${mb(total)} (상한: 파일당 ${mb(MAX_BYTES)})`,
);

if (tooBig.length > 0) {
  console.error(`\n상한을 넘은 파일 ${tooBig.length}개:`);
  for (const entry of tooBig.sort((a, b) => b.bytes - a.bytes)) {
    console.error(`  ${mb(entry.bytes).padStart(9)}  ${relative(ROOT, entry.file)}`);
  }
  console.error(
    "\n긴 변 2000px 이하로 줄여서 다시 커밋하세요. 원본은 legacy-assets-raw/에만 둡니다.",
  );
  process.exit(1);
}

const largest = sized.sort((a, b) => b.bytes - a.bytes).slice(0, 5);
if (largest.length > 0) {
  console.log("가장 큰 파일 5개:");
  for (const entry of largest) {
    console.log(`  ${mb(entry.bytes).padStart(9)}  ${relative(ROOT, entry.file)}`);
  }
}

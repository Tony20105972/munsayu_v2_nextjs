-- AD-015 이미지 관리 (이미지 보관함 · 메인 배너 · 시설안내 사진)
-- 설계 근거: docs/decisions/ADR-008-admin-media-upload.md

-- CreateEnum
CREATE TYPE "MediaSource" AS ENUM ('UPLOAD', 'LEGACY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_UPLOAD';
ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_DELETE';

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "source" "MediaSource" NOT NULL DEFAULT 'UPLOAD',
    "storageKey" TEXT,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "contentHash" TEXT,
    "rightsNote" TEXT,
    "replaceRecommended" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeBanner" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT,
    "eyebrow" TEXT NOT NULL DEFAULT '',
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "primaryLabel" TEXT,
    "primaryHref" TEXT,
    "secondaryLabel" TEXT,
    "secondaryHref" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityPhoto" (
    "id" TEXT NOT NULL,
    "campusKey" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityPhoto_pkey" PRIMARY KEY ("id")
);

-- AlterTable
-- 강사 사진은 커밋된 파일 키가 아니라 보관함의 사진을 가리킨다.
-- 레거시에서 옮겨 온 데이터는 없고(D1/ADR-003), 시드가 이름으로 사진을 다시 붙인다.
ALTER TABLE "Instructor" DROP COLUMN "photoStorageKey",
ADD COLUMN     "photoMediaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_url_key" ON "MediaAsset"("url");

-- CreateIndex
CREATE INDEX "MediaAsset_source_createdAt_idx" ON "MediaAsset"("source", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "HomeBanner_isVisible_displayOrder_idx" ON "HomeBanner"("isVisible", "displayOrder");

-- CreateIndex
CREATE INDEX "FacilityPhoto_campusKey_isVisible_displayOrder_idx" ON "FacilityPhoto"("campusKey", "isVisible", "displayOrder");

-- AddForeignKey
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_photoMediaId_fkey" FOREIGN KEY ("photoMediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeBanner" ADD CONSTRAINT "HomeBanner_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityPhoto" ADD CONSTRAINT "FacilityPhoto_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

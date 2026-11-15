-- AD-015 이미지 삭제·숨기기
-- 기존 사이트 사진(`public/` 에 커밋된 파일)은 실행 중에 지울 수 없어 숨기기로 처리한다.
-- 설계 근거: docs/decisions/ADR-008-admin-media-upload.md

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_HIDE';
ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_UNHIDE';

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenByUserId" TEXT;

-- CreateIndex
CREATE INDEX "MediaAsset_hiddenAt_idx" ON "MediaAsset"("hiddenAt");

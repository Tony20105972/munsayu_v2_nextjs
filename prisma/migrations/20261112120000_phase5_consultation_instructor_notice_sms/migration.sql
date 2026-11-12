-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NoticePublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'RESUME_DOWNLOAD';
ALTER TYPE "AuditAction" ADD VALUE 'NOTICE_IMPORT';

-- AlterTable
ALTER TABLE "Notice" ADD COLUMN     "legacyWrId" INTEGER,
ADD COLUMN     "status" "NoticePublicationStatus" NOT NULL DEFAULT 'DRAFT';

-- Phase 4까지는 `publishedAt`만으로 공개 여부를 정했다. 이미 게시 시각이 있는 글은
-- 새 컬럼에서도 게시 상태로 남아야 한다. 그렇지 않으면 공개 목록에서 사라진다.
UPDATE "Notice" SET "status" = 'PUBLISHED' WHERE "publishedAt" IS NOT NULL;

-- AlterTable
ALTER TABLE "PrivacyRetentionSetting" ADD COLUMN     "consultationRetentionPolicy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "instructorRetentionPolicy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "smsRetentionPolicy" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "NoticeAttachment" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoticeAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationTypeOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationApplication" (
    "id" TEXT NOT NULL,
    "guardianName" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "studentGrade" TEXT NOT NULL,
    "consultationTypeId" TEXT NOT NULL,
    "inquiry" TEXT,
    "privacyConsentAt" TIMESTAMP(3) NOT NULL,
    "retentionPolicyVersion" TEXT NOT NULL,
    "purgeEligibleAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),
    "status" "ConsultationStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorApplicationStatusOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorApplicationStatusOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "education" TEXT NOT NULL,
    "experienceYears" TEXT NOT NULL,
    "specialties" TEXT[],
    "capabilities" TEXT[],
    "headline" TEXT,
    "careerDetail" TEXT,
    "coachingDetail" TEXT,
    "resumeStorageKey" TEXT NOT NULL,
    "resumeFilename" TEXT NOT NULL,
    "resumeContentType" TEXT NOT NULL,
    "resumeSizeBytes" INTEGER NOT NULL,
    "portfolioStorageKey" TEXT,
    "portfolioFilename" TEXT,
    "portfolioContentType" TEXT,
    "portfolioSizeBytes" INTEGER,
    "privacyConsentAt" TIMESTAMP(3) NOT NULL,
    "retentionPolicyVersion" TEXT NOT NULL,
    "purgeEligibleAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT '접수',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsSubscription" (
    "id" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "privacyConsentAt" TIMESTAMP(3) NOT NULL,
    "notifyConsentAt" TIMESTAMP(3) NOT NULL,
    "retentionPolicyVersion" TEXT NOT NULL,
    "purgeEligibleAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NoticeAttachment_storageKey_key" ON "NoticeAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "NoticeAttachment_noticeId_idx" ON "NoticeAttachment"("noticeId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationTypeOption_label_key" ON "ConsultationTypeOption"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationApplication_idempotencyKey_key" ON "ConsultationApplication"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ConsultationApplication_guardianName_createdAt_idx" ON "ConsultationApplication"("guardianName", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationApplication_guardianPhone_createdAt_idx" ON "ConsultationApplication"("guardianPhone", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationApplication_status_createdAt_idx" ON "ConsultationApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationApplication_purgeEligibleAt_purgedAt_idx" ON "ConsultationApplication"("purgeEligibleAt", "purgedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorApplicationStatusOption_label_key" ON "InstructorApplicationStatusOption"("label");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorApplication_resumeStorageKey_key" ON "InstructorApplication"("resumeStorageKey");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorApplication_portfolioStorageKey_key" ON "InstructorApplication"("portfolioStorageKey");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorApplication_idempotencyKey_key" ON "InstructorApplication"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InstructorApplication_name_createdAt_idx" ON "InstructorApplication"("name", "createdAt");

-- CreateIndex
CREATE INDEX "InstructorApplication_status_createdAt_idx" ON "InstructorApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "InstructorApplication_purgeEligibleAt_purgedAt_idx" ON "InstructorApplication"("purgeEligibleAt", "purgedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsSubscription_idempotencyKey_key" ON "SmsSubscription"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SmsSubscription_guardianPhone_createdAt_idx" ON "SmsSubscription"("guardianPhone", "createdAt");

-- CreateIndex
CREATE INDEX "SmsSubscription_createdAt_idx" ON "SmsSubscription"("createdAt");

-- CreateIndex
CREATE INDEX "SmsSubscription_purgeEligibleAt_purgedAt_idx" ON "SmsSubscription"("purgeEligibleAt", "purgedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notice_legacyWrId_key" ON "Notice"("legacyWrId");

-- AddForeignKey
ALTER TABLE "NoticeAttachment" ADD CONSTRAINT "NoticeAttachment_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationApplication" ADD CONSTRAINT "ConsultationApplication_consultationTypeId_fkey" FOREIGN KEY ("consultationTypeId") REFERENCES "ConsultationTypeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

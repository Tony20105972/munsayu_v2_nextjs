import "server-only";
import {
  DEFAULT_INSTRUCTOR_APPLICATION_STATUSES,
  RESUME_CONTENT_TYPES,
  RESUME_FORMAT_LABEL,
  maskName,
  maskPhone,
  maskSchoolName,
  type AdminInstructorApplicationList,
  type AdminInstructorApplicationRow,
  type ApplicationCreatedResult,
  type InstructorApplicationDeleteInput,
  type InstructorApplicationDownloadInput,
  type InstructorApplicationExportInput,
  type InstructorApplicationFilterInput,
  type InstructorApplicationInput,
  type InstructorApplicationStatusChangeInput,
  type InstructorStatusOptionUpsertInput,
} from "@/lib/contracts";
import { createStorageKey, getStorageAdapter } from "@/server/adapters/storage";
import { notifyQuietly } from "@/server/adapters/notify";
import { db, isUniqueViolation } from "@/server/db";
import { notFound, validationFailed } from "@/server/errors";
import { csvRows } from "@/server/lib/csv";
import { detectResumeFormat, isAllowedResumeFormat } from "@/server/lib/file-format";
import { summarizeFilter, writeAuditLog } from "@/server/services/audit";
import {
  getRetentionSetting,
  resolveRetentionPolicyVersion,
} from "@/server/services/privacy";
import { getSiteSettings } from "@/server/services/settings";

/**
 * AD-011 강사 지원.
 *
 * 공개 폼은 레거시 `/sub/Recruit` 를 관찰해 그 계약을 따른다. (EV-0014)
 * 제출 서류는 비공개 영역에 저장하고 공개 주소를 만들지 않는다.
 * 관리자 인증 경로로만 내려받고, 내려받을 때마다 기록을 남긴다. (AD-013)
 */

export type InstructorStatusOptionView = {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

export async function ensureInstructorStatusOptions(): Promise<void> {
  const count = await db.instructorApplicationStatusOption.count();
  if (count > 0) return;

  await db.instructorApplicationStatusOption.createMany({
    data: DEFAULT_INSTRUCTOR_APPLICATION_STATUSES.map((label, index) => ({
      label,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}

export async function listInstructorStatusOptions(): Promise<
  InstructorStatusOptionView[]
> {
  await ensureInstructorStatusOptions();
  const rows = await db.instructorApplicationStatusOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  }));
}

export async function upsertInstructorStatusOption(
  input: InstructorStatusOptionUpsertInput,
): Promise<InstructorStatusOptionView> {
  const data = {
    label: input.label,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  };
  const row = input.id
    ? await db.instructorApplicationStatusOption.update({
        where: { id: input.id },
        data,
      })
    : await db.instructorApplicationStatusOption.create({ data });

  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export type UploadedDocument = {
  filename: string;
  bytes: Uint8Array;
};

export type InstructorApplicationFiles = {
  /** EV-0014 의 필수 첨부 `이력서 및 자기소개서`. */
  resume: UploadedDocument;
  /** EV-0014 의 선택 첨부 `교재·기출 해제안`. */
  portfolio?: UploadedDocument | null;
};

type ValidatedDocument = {
  storageKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  bytes: Uint8Array;
};

/**
 * 제출 서류를 검사한다. 확장자와 브라우저가 보낸 `Content-Type` 은 믿지 않고
 * 파일 내용(매직 바이트)으로 형식을 정한다. 위장 파일은 여기서 걸린다. // ASM-085
 */
function validateDocument(
  field: string,
  document: UploadedDocument,
  maxBytes: number,
): ValidatedDocument {
  if (document.bytes.byteLength === 0) {
    throw validationFailed({ [field]: ["빈 파일은 올릴 수 없습니다."] });
  }
  if (document.bytes.byteLength > maxBytes) {
    const limitMb = Math.floor(maxBytes / (1024 * 1024));
    throw validationFailed({
      [field]: [`파일 용량은 ${limitMb}MB 이하여야 합니다.`],
    });
  }

  const format = detectResumeFormat(document.bytes);
  if (!isAllowedResumeFormat(format)) {
    throw validationFailed({
      [field]: [`${RESUME_FORMAT_LABEL} 형식만 올릴 수 있습니다.`],
    });
  }

  return {
    // 저장 키에 올린 파일 이름을 넣지 않는다. 파일 이름에 실명이 들어 있을 수 있다.
    storageKey: createStorageKey("instructor-applications", format),
    filename: document.filename.slice(0, 200),
    contentType: RESUME_CONTENT_TYPES[format],
    sizeBytes: document.bytes.byteLength,
    bytes: document.bytes,
  };
}

/** 공개 지원서 저장. 파일을 먼저 올리고 DB 저장이 실패하면 올린 파일을 지운다. */
export async function createInstructorApplication(
  input: InstructorApplicationInput,
  files: InstructorApplicationFiles,
): Promise<ApplicationCreatedResult> {
  const existing = await db.instructorApplication.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true, createdAt: true },
  });
  if (existing) {
    return {
      id: existing.id,
      replayed: true,
      createdAt: existing.createdAt.toISOString(),
    };
  }

  const settings = await getSiteSettings();
  const resume = validateDocument("resume", files.resume, settings.resumeMaxBytes);
  const portfolio = files.portfolio
    ? validateDocument("portfolio", files.portfolio, settings.resumeMaxBytes)
    : null;

  const setting = await getRetentionSetting();
  const retentionPolicyVersion = resolveRetentionPolicyVersion("instructor", setting);
  await ensureInstructorStatusOptions();
  const firstStatus = DEFAULT_INSTRUCTOR_APPLICATION_STATUSES[0];

  const storage = getStorageAdapter();
  const stored: string[] = [];

  try {
    await storage.put("private", resume.storageKey, resume.bytes, resume.contentType);
    stored.push(resume.storageKey);
    if (portfolio) {
      await storage.put(
        "private",
        portfolio.storageKey,
        portfolio.bytes,
        portfolio.contentType,
      );
      stored.push(portfolio.storageKey);
    }

    const created = await db.instructorApplication.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        education: input.education,
        experienceYears: input.experienceYears,
        specialties: [...input.specialties],
        capabilities: [...input.capabilities],
        headline: input.headline,
        careerDetail: input.careerDetail,
        coachingDetail: input.coachingDetail,
        resumeStorageKey: resume.storageKey,
        resumeFilename: resume.filename,
        resumeContentType: resume.contentType,
        resumeSizeBytes: resume.sizeBytes,
        portfolioStorageKey: portfolio?.storageKey ?? null,
        portfolioFilename: portfolio?.filename ?? null,
        portfolioContentType: portfolio?.contentType ?? null,
        portfolioSizeBytes: portfolio?.sizeBytes ?? null,
        privacyConsentAt: new Date(),
        retentionPolicyVersion,
        status: firstStatus,
        idempotencyKey: input.idempotencyKey,
      },
      select: { id: true, createdAt: true },
    });

    await notifyQuietly({
      channel: "staff",
      text: "새 강사 지원서 1건이 접수되었습니다.",
    });

    return {
      id: created.id,
      replayed: false,
      createdAt: created.createdAt.toISOString(),
    };
  } catch (error) {
    // DB 저장에 실패하면 방금 올린 파일을 남기지 않는다.
    for (const key of stored) {
      await storage.remove("private", key).catch(() => undefined);
    }

    // 같은 key 가 동시에 들어오면 먼저 저장된 건을 재전송 결과로 돌려준다.
    if (isUniqueViolation(error)) {
      const saved = await db.instructorApplication.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true, createdAt: true },
      });
      if (saved) {
        return {
          id: saved.id,
          replayed: true,
          createdAt: saved.createdAt.toISOString(),
        };
      }
    }

    throw error;
  }
}

function instructorWhere(filter: InstructorApplicationExportInput) {
  const createdAt =
    filter.from || filter.to
      ? {
          ...(filter.from ? { gte: filter.from } : {}),
          ...(filter.to ? { lte: filter.to } : {}),
        }
      : undefined;

  return {
    ...(filter.status ? { status: filter.status } : {}),
    ...(createdAt ? { createdAt } : {}),
    // EV-ADM-09 의 검색 항목은 강사 실명 하나다.
    ...(filter.keyword ? { name: { contains: filter.keyword } } : {}),
  };
}

export async function listInstructorApplications(
  filter: InstructorApplicationFilterInput,
): Promise<AdminInstructorApplicationList> {
  const where = instructorWhere(filter);
  const skip = (filter.page - 1) * filter.pageSize;

  const [total, rows] = await Promise.all([
    db.instructorApplication.count({ where }),
    db.instructorApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: filter.pageSize,
    }),
  ]);

  const items: AdminInstructorApplicationRow[] = rows.map((row) => ({
    id: row.id,
    maskedName: maskName(row.name),
    maskedPhone: maskPhone(row.phone),
    // 최종 학력에는 학교 이름이 들어가므로 목록에서는 가린다.
    maskedEducation: maskSchoolName(row.education),
    experienceYears: row.experienceYears,
    specialties: row.specialties,
    hasResume: Boolean(row.resumeStorageKey) && row.purgedAt === null,
    hasPortfolio: Boolean(row.portfolioStorageKey) && row.purgedAt === null,
    status: row.status,
    appliedAt: row.createdAt.toISOString(),
    purgeEligibleAt: row.purgeEligibleAt?.toISOString() ?? null,
  }));

  return { items, total, page: filter.page, pageSize: filter.pageSize };
}

export type RevealedInstructorApplication = {
  id: string;
  name: string;
  phone: string;
  email: string;
  education: string;
  experienceYears: string;
  specialties: string[];
  capabilities: string[];
  headline: string | null;
  careerDetail: string | null;
  coachingDetail: string | null;
  resumeFilename: string;
  portfolioFilename: string | null;
  status: string;
  appliedAt: string;
  privacyConsentAt: string;
  retentionPolicyVersion: string;
  auditId: string;
};

export async function revealInstructorApplication(
  actorUserId: string,
  applicationId: string,
): Promise<RevealedInstructorApplication> {
  const row = await db.instructorApplication.findUnique({
    where: { id: applicationId },
  });
  if (!row) throw notFound();

  const audit = await writeAuditLog({
    actorUserId,
    action: "PII_VIEW",
    resourceType: "InstructorApplication",
    resourceId: row.id,
  });

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    education: row.education,
    experienceYears: row.experienceYears,
    specialties: row.specialties,
    capabilities: row.capabilities,
    headline: row.headline,
    careerDetail: row.careerDetail,
    coachingDetail: row.coachingDetail,
    resumeFilename: row.resumeFilename,
    portfolioFilename: row.portfolioFilename,
    status: row.status,
    appliedAt: row.createdAt.toISOString(),
    privacyConsentAt: row.privacyConsentAt.toISOString(),
    retentionPolicyVersion: row.retentionPolicyVersion,
    auditId: audit.id,
  };
}

export type DownloadedDocument = {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
};

/**
 * AD-011 제출 서류 내려받기. 관리자 인증 경로로만 부를 수 있고 기록을 남긴다. (AD-013)
 * 파기된 건은 파일도 지워졌으므로 404 로 답한다.
 */
export async function downloadInstructorDocument(
  actorUserId: string,
  input: InstructorApplicationDownloadInput,
): Promise<DownloadedDocument> {
  const row = await db.instructorApplication.findUnique({
    where: { id: input.applicationId },
  });
  if (!row || row.purgedAt) throw notFound();

  const storageKey =
    input.document === "resume" ? row.resumeStorageKey : row.portfolioStorageKey;
  const filename =
    input.document === "resume" ? row.resumeFilename : row.portfolioFilename;
  const contentType =
    input.document === "resume" ? row.resumeContentType : row.portfolioContentType;
  if (!storageKey || !filename || !contentType) throw notFound();

  const bytes = await getStorageAdapter()
    .get("private", storageKey)
    .catch(() => null);
  if (!bytes) throw notFound();

  await writeAuditLog({
    actorUserId,
    action: "RESUME_DOWNLOAD",
    resourceType: "InstructorApplication",
    resourceId: row.id,
    filterSummary: `document=${input.document}`,
  });

  return { bytes, filename, contentType };
}

export async function changeInstructorApplicationStatus(
  actorUserId: string,
  input: InstructorApplicationStatusChangeInput,
): Promise<{ updated: number }> {
  // 상태 목록은 관리자가 바꿀 수 있으므로 저장 직전에 쓸 수 있는 값인지 확인한다.
  await ensureInstructorStatusOptions();
  const option = await db.instructorApplicationStatusOption.findFirst({
    where: { label: input.status, isActive: true },
    select: { id: true },
  });
  if (!option) {
    throw validationFailed({ status: ["선택할 수 없는 상태입니다."] });
  }

  const result = await db.instructorApplication.updateMany({
    where: { id: { in: input.applicationIds } },
    data: { status: input.status },
  });

  await writeAuditLog({
    actorUserId,
    action: "MEMBER_STATUS_CHANGE",
    resourceType: "InstructorApplication",
    filterSummary: `status=${input.status};count=${result.count}`,
  });

  return { updated: result.count };
}

/** EV-ADM-09 `선택삭제`. 행과 함께 저장된 제출 서류 파일도 지운다. */
export async function deleteInstructorApplications(
  actorUserId: string,
  input: InstructorApplicationDeleteInput,
): Promise<{ deleted: number; removedFiles: number }> {
  const rows = await db.instructorApplication.findMany({
    where: { id: { in: input.applicationIds } },
    select: { id: true, resumeStorageKey: true, portfolioStorageKey: true },
  });

  const result = await db.instructorApplication.deleteMany({
    where: { id: { in: rows.map((row) => row.id) } },
  });

  const storage = getStorageAdapter();
  let removedFiles = 0;
  for (const row of rows) {
    for (const key of [row.resumeStorageKey, row.portfolioStorageKey]) {
      if (!key) continue;
      await storage.remove("private", key).catch(() => undefined);
      removedFiles += 1;
    }
  }

  await writeAuditLog({
    actorUserId,
    action: "PII_PURGE",
    resourceType: "InstructorApplication",
    filterSummary: `deleted=${result.count};files=${removedFiles}`,
  });

  return { deleted: result.count, removedFiles };
}

/** AD-013 현재 필터 결과 전체 CSV. 제출 서류 파일 자체는 넣지 않는다. */
export async function exportInstructorApplicationsCsv(
  actorUserId: string,
  filter: InstructorApplicationExportInput,
): Promise<{ csv: string; rowCount: number; auditId: string }> {
  const rows = await db.instructorApplication.findMany({
    where: instructorWhere(filter),
    orderBy: { createdAt: "desc" },
  });

  const csv = csvRows(
    [
      "지원ID",
      "강사명",
      "연락처",
      "이메일",
      "최종 학력",
      "경력 연수",
      "지원 분야",
      "핵심 역량",
      "이력서 파일명",
      "추가 서류 파일명",
      "상태",
      "지원 일시",
    ],
    rows.map((row) => [
      row.id,
      row.name,
      row.phone,
      row.email,
      row.education,
      row.experienceYears,
      row.specialties.join(" / "),
      row.capabilities.join(" / "),
      row.resumeFilename,
      row.portfolioFilename ?? "",
      row.status,
      row.createdAt.toISOString(),
    ]),
  );

  const audit = await writeAuditLog({
    actorUserId,
    action: "CSV_EXPORT",
    resourceType: "InstructorApplication",
    filterSummary: summarizeFilter(
      {
        status: filter.status,
        keyword: filter.keyword,
        from: filter.from,
        to: filter.to,
      },
      rows.length,
    ),
  });

  return { csv, rowCount: rows.length, auditId: audit.id };
}

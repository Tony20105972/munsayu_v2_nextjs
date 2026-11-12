"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ADMIN_TABLE_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminEmptyRow,
  AdminTableScroll,
} from "@/components/admin/ui";
import { AdminActionForm, AdminInlineForm } from "@/components/admin/forms";
import {
  AdminCheckboxField,
  AdminSelectField,
  AdminTextField,
} from "@/components/admin/fields";
import { NoticeEditor } from "@/components/admin/notice-editor";
import {
  addNoticeAttachmentAction,
  deleteNoticesAction,
  removeNoticeAttachmentAction,
  upsertNoticeAction,
} from "@/lib/actions/admin-intake";
import type { AdminNoticeRow } from "@/lib/contracts";
import { formatDateTime } from "@/lib/view-models";

/**
 * AD-014 공지사항 관리.
 *
 * 레거시 게시판은 `notice` 하나뿐이라(EV-ADM-10/11) 게시판 엔진을 옮기지 않고
 * 공지사항 단일 게시판으로 만든다. // ASM-089
 * 임시 저장(`DRAFT`) 글은 공개 목록·상세에 절대 나오지 않는다.
 */

const STATUS_LABEL = { DRAFT: "임시 저장", PUBLISHED: "게시" } as const;

export function NoticesTable({ rows }: { rows: readonly AdminNoticeRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="space-y-3">
      {selected.length === 0 ? (
        <p className="text-xs text-muted">
          왼쪽 상자로 글을 고르면 한 번에 지울 수 있습니다.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-canvas px-3 py-2">
          <span className="text-xs font-bold text-ink">{selected.length}건 선택됨</span>
          <AdminInlineForm
            action={async (formData) => {
              const result = await deleteNoticesAction(formData);
              if (result.ok) setSelected([]);
              return result;
            }}
            submitLabel="선택삭제"
          >
            {selected.map((id) => (
              <input key={id} type="hidden" name="noticeIds" value={id} />
            ))}
          </AdminInlineForm>
        </div>
      )}

      <AdminTableScroll>
        <table className={ADMIN_TABLE_CLASS}>
          <caption className="sr-only">공지사항 목록</caption>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH_CLASS}>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand"
                    checked={allSelected}
                    onChange={(event) =>
                      setSelected(event.target.checked ? rows.map((row) => row.id) : [])
                    }
                  />
                  <span className="sr-only">전체 선택</span>
                </label>
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                번호
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                제목
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                상단 고정
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                게시 상태
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                게시일
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                첨부
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <AdminEmptyRow colSpan={8} label="등록된 공지가 없습니다." />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className={ADMIN_TD_CLASS}>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="size-4 accent-brand"
                        checked={selected.includes(row.id)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...new Set([...current, row.id])]
                              : current.filter((value) => value !== row.id),
                          )
                        }
                      />
                      <span className="sr-only">{row.title} 선택</span>
                    </label>
                  </td>
                  <td className={ADMIN_TD_CLASS}>{row.legacyWrId ?? "—"}</td>
                  <td className={ADMIN_TD_CLASS}>{row.title}</td>
                  <td className={ADMIN_TD_CLASS}>{row.isPinned ? "고정" : "—"}</td>
                  <td className={ADMIN_TD_CLASS}>{STATUS_LABEL[row.status]}</td>
                  <td className={ADMIN_TD_CLASS}>{formatDateTime(row.publishedAt)}</td>
                  <td className={ADMIN_TD_CLASS}>{row.attachmentCount}개</td>
                  <td className={ADMIN_TD_CLASS}>
                    <Link
                      href={`/admin/notices/${row.id}`}
                      className="whitespace-nowrap rounded-md border border-line bg-canvas px-2 py-1 text-xs font-bold text-ink hover:bg-line/40"
                    >
                      수정
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableScroll>
    </div>
  );
}

export type NoticeFormValues = {
  id?: string;
  title: string;
  body: string;
  isPinned: boolean;
  status: "DRAFT" | "PUBLISHED";
  /** `datetime-local` 입력에 넣을 `YYYY-MM-DDTHH:mm` 형식 */
  publishedAtLocal: string;
};

export function NoticeForm({ values }: { values?: NoticeFormValues }) {
  return (
    <AdminActionForm
      action={upsertNoticeAction}
      submitLabel={values?.id ? "공지 저장" : "공지 등록"}
      className="space-y-4"
    >
      {({ fieldErrors }) => (
        <>
          {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

          <AdminTextField
            name="title"
            label="제목"
            required
            defaultValue={values?.title}
            errors={fieldErrors.title}
          />

          <NoticeEditor name="body" label="본문" defaultValue={values?.body ?? ""} />
          {fieldErrors.body ? (
            <p role="alert" className="text-xs font-bold text-red-700">
              {fieldErrors.body.join(" ")}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <AdminSelectField
              name="status"
              label="게시 상태"
              required
              defaultValue={values?.status ?? "DRAFT"}
              errors={fieldErrors.status}
              options={[
                { value: "DRAFT", label: "임시 저장 (공개되지 않음)" },
                { value: "PUBLISHED", label: "게시" },
              ]}
            />
            <AdminTextField
              name="publishedAt"
              label="게시 일시"
              type="datetime-local"
              hint="비우면 게시하는 순간의 시각을 씁니다."
              defaultValue={values?.publishedAtLocal}
              errors={fieldErrors.publishedAt}
            />
            <AdminCheckboxField
              name="isPinned"
              label="목록 맨 위에 고정"
              defaultChecked={values?.isPinned}
            />
          </div>
        </>
      )}
    </AdminActionForm>
  );
}

export function NoticeAttachmentsPanel({
  noticeId,
  attachments,
}: {
  noticeId: string;
  attachments: ReadonlyArray<{ id: string; filename: string; sizeBytes: number }>;
}) {
  return (
    <div className="space-y-4">
      {attachments.length === 0 ? (
        <p className="text-xs text-muted">첨부된 파일이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-canvas px-3 py-2"
            >
              <a
                href={`/api/notices/attachments/${attachment.id}`}
                className="text-sm font-bold text-ink underline"
              >
                {attachment.filename}
              </a>
              <span className="text-xs text-muted">
                {Math.max(1, Math.round(attachment.sizeBytes / 1024))}KB
              </span>
              <AdminInlineForm
                action={removeNoticeAttachmentAction}
                submitLabel="첨부 삭제"
              >
                <input type="hidden" name="attachmentId" value={attachment.id} />
              </AdminInlineForm>
            </li>
          ))}
        </ul>
      )}

      <AdminActionForm
        action={addNoticeAttachmentAction}
        submitLabel="첨부파일 추가"
        resetOnSuccess
      >
        {({ fieldErrors }) => (
          <>
            <input type="hidden" name="noticeId" value={noticeId} />
            <div>
              <label
                htmlFor="notice-attachment"
                className="block text-xs font-bold text-ink"
              >
                첨부할 파일
              </label>
              <input
                id="notice-attachment"
                name="attachment"
                type="file"
                accept=".pdf,.docx,.hwp,.hwpx,image/png,image/jpeg,image/gif,image/webp"
                className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              />
              {fieldErrors.attachment ? (
                <p role="alert" className="mt-1 text-xs font-bold text-red-700">
                  {fieldErrors.attachment.join(" ")}
                </p>
              ) : null}
            </div>
          </>
        )}
      </AdminActionForm>
    </div>
  );
}

"use client";

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
  AdminInlineNumber,
  AdminInlineSelect,
  AdminTextField,
} from "@/components/admin/fields";
import { RevealDialogButton } from "@/components/admin/reveal-dialog";
import {
  changeInstructorApplicationStatusAction,
  deleteInstructorApplicationsAction,
  revealInstructorApplicationAction,
  upsertInstructorStatusOptionAction,
} from "@/lib/actions/admin-intake";
import type { AdminInstructorApplicationRow } from "@/lib/contracts";
import { formatDateTime } from "@/lib/view-models";

/**
 * AD-011 강사지원관리.
 *
 * 레거시 화면(EV-ADM-09)의 구성을 따른다: 전체 지원자 수, 강사 실명 검색,
 * 목록 열(강사명·연락처·최종 학력·경력 연수·지원 분야·이력서·상태·지원 일시·관리),
 * `선택수정`·`선택삭제`.
 *
 * 이력서는 공개 주소가 없다. 「내려받기」는 관리자 인증 경로를 거치고 기록에 남는다. (AD-013)
 */

export type InstructorStatusChoice = { id: string; label: string; isActive: boolean };

export function InstructorApplicationsTable({
  rows,
  statuses,
}: {
  rows: readonly AdminInstructorApplicationRow[];
  statuses: readonly InstructorStatusChoice[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const statusOptions = statuses
    .filter((status) => status.isActive)
    .map((status) => ({ value: status.label, label: status.label }));

  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggle(id: string, checked: boolean) {
    setSelected((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((value) => value !== id),
    );
  }

  return (
    <div className="space-y-3">
      {selected.length === 0 ? (
        <p className="text-xs text-muted">
          왼쪽 상자로 지원서를 고르면 한 번에 상태를 바꾸거나 지울 수 있습니다.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-canvas px-3 py-2">
          <span className="text-xs font-bold text-ink">{selected.length}건 선택됨</span>

          <AdminInlineForm
            action={changeInstructorApplicationStatusAction}
            submitLabel="선택수정"
          >
            {selected.map((id) => (
              <input key={id} type="hidden" name="applicationIds" value={id} />
            ))}
            <AdminInlineSelect
              name="status"
              label="선택한 지원서의 상태"
              options={statusOptions}
            />
          </AdminInlineForm>

          <AdminInlineForm
            action={async (formData) => {
              const result = await deleteInstructorApplicationsAction(formData);
              if (result.ok) setSelected([]);
              return result;
            }}
            submitLabel="선택삭제"
          >
            {selected.map((id) => (
              <input key={id} type="hidden" name="applicationIds" value={id} />
            ))}
          </AdminInlineForm>
        </div>
      )}

      <AdminTableScroll>
        <table className={ADMIN_TABLE_CLASS}>
          <caption className="sr-only">강사 지원 목록</caption>
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
                강사명
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                연락처
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                최종 학력
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                경력 연수
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                지원 분야
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                이력서
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                상태
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                지원 일시
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <AdminEmptyRow
                colSpan={10}
                label="접수된 강사 지원 서류 명단이 존재하지 않습니다."
              />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className={ADMIN_TD_CLASS}>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="size-4 accent-brand"
                        checked={selected.includes(row.id)}
                        onChange={(event) => toggle(row.id, event.target.checked)}
                      />
                      <span className="sr-only">{row.maskedName} 선택</span>
                    </label>
                  </td>
                  <td className={ADMIN_TD_CLASS}>{row.maskedName}</td>
                  <td className={ADMIN_TD_CLASS}>{row.maskedPhone}</td>
                  <td className={ADMIN_TD_CLASS}>{row.maskedEducation}</td>
                  <td className={ADMIN_TD_CLASS}>{row.experienceYears}</td>
                  <td className={ADMIN_TD_CLASS}>{row.specialties.join(" / ")}</td>
                  <td className={ADMIN_TD_CLASS}>
                    <div className="flex flex-wrap gap-1">
                      {row.hasResume ? (
                        <a
                          href={`/api/admin/instructor-applications/document?applicationId=${row.id}&document=resume`}
                          className="whitespace-nowrap rounded-md border border-accent/60 bg-accent/10 px-2 py-1 text-xs font-bold text-ink hover:bg-accent/20"
                        >
                          이력서 내려받기
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                      {row.hasPortfolio ? (
                        <a
                          href={`/api/admin/instructor-applications/document?applicationId=${row.id}&document=portfolio`}
                          className="whitespace-nowrap rounded-md border border-line bg-canvas px-2 py-1 text-xs font-bold text-ink hover:bg-line/40"
                        >
                          추가 서류
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <AdminInlineForm
                      action={changeInstructorApplicationStatusAction}
                      submitLabel="변경"
                    >
                      <input type="hidden" name="applicationIds" value={row.id} />
                      <AdminInlineSelect
                        name="status"
                        label={`${row.maskedName} 상태`}
                        options={statusOptions}
                        defaultValue={row.status}
                      />
                    </AdminInlineForm>
                  </td>
                  <td className={ADMIN_TD_CLASS}>{formatDateTime(row.appliedAt)}</td>
                  <td className={ADMIN_TD_CLASS}>
                    <RevealDialogButton
                      action={revealInstructorApplicationAction}
                      hiddenFields={{ applicationId: row.id }}
                      title="강사 지원서 원문 보기"
                      describe={(data) => [
                        { label: "강사명", value: data.name },
                        { label: "연락처", value: data.phone },
                        { label: "이메일", value: data.email },
                        { label: "최종 학력", value: data.education },
                        { label: "경력 연수", value: data.experienceYears },
                        { label: "지원 분야", value: data.specialties.join(" / ") },
                        { label: "핵심 역량", value: data.capabilities.join(" / ") },
                        { label: "한 줄 소개", value: data.headline ?? "—" },
                        { label: "주요 경력", value: data.careerDetail ?? "—" },
                        { label: "첨삭 노하우", value: data.coachingDetail ?? "—" },
                        { label: "이력서 파일", value: data.resumeFilename },
                        {
                          label: "추가 서류",
                          value: data.portfolioFilename ?? "—",
                        },
                        { label: "지원 일시", value: formatDateTime(data.appliedAt) },
                        {
                          label: "동의 시각",
                          value: formatDateTime(data.privacyConsentAt),
                        },
                      ]}
                    />
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

/** 지원 상태 목록은 관리자가 추가·수정한다. // ASM-087 */
export function InstructorStatusOptionsPanel({
  statuses,
}: {
  statuses: readonly (InstructorStatusChoice & { sortOrder: number })[];
}) {
  return (
    <div className="space-y-4">
      <AdminTableScroll>
        <table className={ADMIN_TABLE_CLASS}>
          <caption className="sr-only">강사 지원 상태 목록</caption>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH_CLASS}>
                상태 이름
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                노출 순서
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                사용
              </th>
            </tr>
          </thead>
          <tbody>
            {statuses.length === 0 ? (
              <AdminEmptyRow colSpan={3} label="등록된 상태가 없습니다." />
            ) : (
              statuses.map((status) => (
                <tr key={status.id}>
                  <td className={ADMIN_TD_CLASS}>
                    <AdminInlineForm
                      action={upsertInstructorStatusOptionAction}
                      submitLabel="저장"
                    >
                      <input type="hidden" name="id" value={status.id} />
                      <input type="hidden" name="sortOrder" value={status.sortOrder} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={String(status.isActive)}
                      />
                      <label className="sr-only" htmlFor={`status-label-${status.id}`}>
                        상태 이름
                      </label>
                      <input
                        id={`status-label-${status.id}`}
                        name="label"
                        defaultValue={status.label}
                        className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
                      />
                    </AdminInlineForm>
                  </td>
                  <td className={ADMIN_TD_CLASS}>{status.sortOrder}</td>
                  <td className={ADMIN_TD_CLASS}>
                    {status.isActive ? "사용" : "숨김"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableScroll>

      <AdminActionForm
        action={upsertInstructorStatusOptionAction}
        submitLabel="상태 추가"
        resetOnSuccess
        className="grid gap-3 sm:grid-cols-3"
      >
        {({ fieldErrors }) => (
          <>
            <AdminTextField
              name="label"
              label="상태 이름"
              required
              errors={fieldErrors.label}
            />
            <div>
              <span className="block text-xs font-bold text-ink">노출 순서</span>
              <div className="mt-1">
                <AdminInlineNumber
                  name="sortOrder"
                  label="노출 순서"
                  defaultValue={0}
                />
              </div>
            </div>
            <AdminCheckboxField name="isActive" label="사용" defaultChecked />
          </>
        )}
      </AdminActionForm>
    </div>
  );
}

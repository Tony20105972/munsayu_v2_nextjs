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
  changeConsultationStatusAction,
  deactivateConsultationTypeAction,
  deleteConsultationsAction,
  revealConsultationAction,
  upsertConsultationTypeAction,
} from "@/lib/actions/admin-intake";
import {
  CONSULTATION_STATUSES,
  CONSULTATION_STATUS_LABELS,
  type AdminConsultationRow,
} from "@/lib/contracts";
import { formatDateTime } from "@/lib/view-models";

/**
 * AD-009 입학진단 및 상담 신청관리.
 *
 * 레거시 화면(EV-ADM-08)의 구성을 따른다: 상태별 건수, 학부모 성함 검색,
 * 목록에서 처리 상태 선택 상자, `선택수정`·`선택삭제`.
 * 목록에 들어오는 이름·연락처는 서버가 가린 값이다. (AD-013)
 */

const STATUS_OPTIONS = CONSULTATION_STATUSES.map((status) => ({
  value: status,
  label: CONSULTATION_STATUS_LABELS[status],
}));

export function ConsultationsTable({
  rows,
}: {
  rows: readonly AdminConsultationRow[];
}) {
  const [selected, setSelected] = useState<string[]>([]);

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
      <BulkActions selected={selected} onDone={() => setSelected([])} />

      <AdminTableScroll>
        <table className={ADMIN_TABLE_CLASS}>
          <caption className="sr-only">입학진단 및 상담 신청 목록</caption>
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
                학부모 성함
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                연락처
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                학생 학년
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                상담 유형
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                문의 내용
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                신청일시
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                처리 상태
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <AdminEmptyRow colSpan={9} label="조건에 맞는 신청이 없습니다." />
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
                      <span className="sr-only">{row.maskedGuardianName} 선택</span>
                    </label>
                  </td>
                  <td className={ADMIN_TD_CLASS}>{row.maskedGuardianName}</td>
                  <td className={ADMIN_TD_CLASS}>{row.maskedGuardianPhone}</td>
                  <td className={ADMIN_TD_CLASS}>{row.studentGrade}</td>
                  <td className={ADMIN_TD_CLASS}>{row.consultationType}</td>
                  <td className={ADMIN_TD_CLASS}>
                    {/* 문의 내용 자체가 개인정보일 수 있어 목록에서는 있음/없음만 보여 준다. */}
                    {row.hasInquiry ? "있음" : "—"}
                  </td>
                  <td className={ADMIN_TD_CLASS}>{formatDateTime(row.appliedAt)}</td>
                  <td className={ADMIN_TD_CLASS}>
                    <AdminInlineForm
                      action={changeConsultationStatusAction}
                      submitLabel="변경"
                    >
                      <input type="hidden" name="applicationIds" value={row.id} />
                      <AdminInlineSelect
                        name="status"
                        label={`${row.maskedGuardianName} 처리 상태`}
                        options={STATUS_OPTIONS}
                        defaultValue={row.status}
                      />
                    </AdminInlineForm>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <RevealDialogButton
                      action={revealConsultationAction}
                      hiddenFields={{ applicationId: row.id }}
                      title="상담 신청 원문 보기"
                      describe={(data) => [
                        { label: "학부모 성함", value: data.guardianName },
                        { label: "연락처", value: data.guardianPhone },
                        { label: "학생 학년", value: data.studentGrade },
                        { label: "상담 유형", value: data.consultationType },
                        { label: "문의 내용", value: data.inquiry ?? "—" },
                        { label: "신청일시", value: formatDateTime(data.appliedAt) },
                        {
                          label: "동의 시각",
                          value: formatDateTime(data.privacyConsentAt),
                        },
                        { label: "동의 문구 버전", value: data.retentionPolicyVersion },
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

/** EV-ADM-08 의 `선택수정`·`선택삭제`. 고른 건이 없으면 아무 것도 하지 않는다. */
function BulkActions({
  selected,
  onDone,
}: {
  selected: readonly string[];
  onDone: () => void;
}) {
  if (selected.length === 0) {
    return (
      <p className="text-xs text-muted">
        왼쪽 상자로 건을 고르면 한 번에 상태를 바꾸거나 지울 수 있습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-canvas px-3 py-2">
      <span className="text-xs font-bold text-ink">{selected.length}건 선택됨</span>

      <AdminInlineForm action={changeConsultationStatusAction} submitLabel="선택수정">
        {selected.map((id) => (
          <input key={id} type="hidden" name="applicationIds" value={id} />
        ))}
        <AdminInlineSelect
          name="status"
          label="선택한 건의 처리 상태"
          options={STATUS_OPTIONS}
        />
      </AdminInlineForm>

      <AdminInlineForm
        action={async (formData) => {
          const result = await deleteConsultationsAction(formData);
          if (result.ok) onDone();
          return result;
        }}
        submitLabel="선택삭제"
      >
        {selected.map((id) => (
          <input key={id} type="hidden" name="applicationIds" value={id} />
        ))}
      </AdminInlineForm>
    </div>
  );
}

export type ConsultationTypeRow = {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

/** 상담 유형은 관리자가 추가·수정한다. 쓰인 유형은 지우지 않고 숨긴다. // ASM-083 */
export function ConsultationTypesPanel({
  types,
}: {
  types: readonly ConsultationTypeRow[];
}) {
  return (
    <div className="space-y-4">
      <AdminTableScroll>
        <table className={ADMIN_TABLE_CLASS}>
          <caption className="sr-only">상담 유형 목록</caption>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH_CLASS}>
                유형 이름
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                노출 순서
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                신청 폼 노출
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {types.length === 0 ? (
              <AdminEmptyRow colSpan={4} label="등록된 상담 유형이 없습니다." />
            ) : (
              types.map((type) => (
                <tr key={type.id}>
                  <td className={ADMIN_TD_CLASS}>
                    <AdminInlineForm
                      action={upsertConsultationTypeAction}
                      submitLabel="저장"
                    >
                      <input type="hidden" name="id" value={type.id} />
                      <input type="hidden" name="sortOrder" value={type.sortOrder} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={String(type.isActive)}
                      />
                      <label className="sr-only" htmlFor={`type-label-${type.id}`}>
                        유형 이름
                      </label>
                      <input
                        id={`type-label-${type.id}`}
                        name="label"
                        defaultValue={type.label}
                        className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
                      />
                    </AdminInlineForm>
                  </td>
                  <td className={ADMIN_TD_CLASS}>{type.sortOrder}</td>
                  <td className={ADMIN_TD_CLASS}>{type.isActive ? "노출" : "숨김"}</td>
                  <td className={ADMIN_TD_CLASS}>
                    {type.isActive ? (
                      <AdminInlineForm
                        action={deactivateConsultationTypeAction}
                        submitLabel="숨기기"
                      >
                        <input type="hidden" name="id" value={type.id} />
                      </AdminInlineForm>
                    ) : (
                      <AdminInlineForm
                        action={upsertConsultationTypeAction}
                        submitLabel="다시 노출"
                      >
                        <input type="hidden" name="id" value={type.id} />
                        <input type="hidden" name="label" value={type.label} />
                        <input type="hidden" name="sortOrder" value={type.sortOrder} />
                        <input type="hidden" name="isActive" value="true" />
                      </AdminInlineForm>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableScroll>

      <AdminActionForm
        action={upsertConsultationTypeAction}
        submitLabel="상담 유형 추가"
        resetOnSuccess
        className="grid gap-3 sm:grid-cols-3"
      >
        {({ fieldErrors }) => (
          <>
            <AdminTextField
              name="label"
              label="유형 이름"
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
            <AdminCheckboxField
              name="isActive"
              label="신청 폼에 노출"
              defaultChecked
              errors={fieldErrors.isActive}
            />
          </>
        )}
      </AdminActionForm>
    </div>
  );
}

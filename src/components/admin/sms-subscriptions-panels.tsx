"use client";

import { useState } from "react";
import {
  ADMIN_TABLE_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminEmptyRow,
  AdminTableScroll,
} from "@/components/admin/ui";
import { AdminInlineForm } from "@/components/admin/forms";
import { RevealDialogButton } from "@/components/admin/reveal-dialog";
import {
  deleteSmsSubscriptionsAction,
  revealSmsSubscriptionAction,
} from "@/lib/actions/admin-intake";
import type { AdminSmsSubscriptionRow } from "@/lib/contracts";
import { formatDateTime } from "@/lib/view-models";

/**
 * AD-010 문자신청내역 (설명회 알림 신청).
 *
 * 레거시 메뉴 이름은 `문자신청내역`이지만 **문자 발송 기능은 없다.** 신청 내역만 본다.
 * 이름·학교·연락처는 서버가 가린 값으로 내려온다. (AD-013)
 */
export function SmsSubscriptionsTable({
  rows,
}: {
  rows: readonly AdminSmsSubscriptionRow[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="space-y-3">
      {selected.length === 0 ? (
        <p className="text-xs text-muted">
          왼쪽 상자로 건을 고르면 한 번에 지울 수 있습니다.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-canvas px-3 py-2">
          <span className="text-xs font-bold text-ink">{selected.length}건 선택됨</span>
          <AdminInlineForm
            action={async (formData) => {
              const result = await deleteSmsSubscriptionsAction(formData);
              if (result.ok) setSelected([]);
              return result;
            }}
            submitLabel="선택삭제"
          >
            {selected.map((id) => (
              <input key={id} type="hidden" name="subscriptionIds" value={id} />
            ))}
          </AdminInlineForm>
        </div>
      )}

      <AdminTableScroll>
        <table className={ADMIN_TABLE_CLASS}>
          <caption className="sr-only">설명회 알림 신청 목록</caption>
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
                학년
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                학생 이름
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                학교명
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                보호자 연락처
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                신청일시
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <AdminEmptyRow colSpan={7} label="조건에 맞는 알림 신청이 없습니다." />
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
                      <span className="sr-only">{row.maskedStudentName} 선택</span>
                    </label>
                  </td>
                  <td className={ADMIN_TD_CLASS}>{row.grade}</td>
                  <td className={ADMIN_TD_CLASS}>{row.maskedStudentName}</td>
                  <td className={ADMIN_TD_CLASS}>{row.maskedSchoolName}</td>
                  <td className={ADMIN_TD_CLASS}>{row.maskedGuardianPhone}</td>
                  <td className={ADMIN_TD_CLASS}>{formatDateTime(row.appliedAt)}</td>
                  <td className={ADMIN_TD_CLASS}>
                    <RevealDialogButton
                      action={revealSmsSubscriptionAction}
                      hiddenFields={{ subscriptionId: row.id }}
                      title="설명회 알림 신청 원문 보기"
                      describe={(data) => [
                        { label: "학년", value: data.grade },
                        { label: "학생 이름", value: data.studentName },
                        { label: "학교명", value: data.schoolName },
                        { label: "보호자 연락처", value: data.guardianPhone },
                        { label: "신청일시", value: formatDateTime(data.appliedAt) },
                        {
                          label: "개인정보 동의",
                          value: formatDateTime(data.privacyConsentAt),
                        },
                        {
                          label: "알림 수신 동의",
                          value: formatDateTime(data.notifyConsentAt),
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

"use client";

import { useId, useState } from "react";
import { AdminCheckboxField, AdminTextField } from "@/components/admin/fields";
import { AdminActionForm } from "@/components/admin/forms";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { runPurgeAction, updateRetentionSettingAction } from "@/lib/actions/admin";

/** AD-013 개인정보 관리 화면의 입력 부분. */

export function RetentionSettingForm({
  courseRetentionPolicy,
  eventRetentionPolicy,
  consultationRetentionPolicy,
  instructorRetentionPolicy,
  smsRetentionPolicy,
  automaticPurgeEnabled,
}: {
  courseRetentionPolicy: string;
  eventRetentionPolicy: string;
  consultationRetentionPolicy: string;
  instructorRetentionPolicy: string;
  smsRetentionPolicy: string;
  automaticPurgeEnabled: boolean;
}) {
  return (
    <AdminActionForm
      action={updateRetentionSettingAction}
      submitLabel="보존 설정 저장"
      successMessage="보존 설정을 저장했습니다. 변경 기록이 남았습니다."
    >
      {({ fieldErrors }) => (
        <div className="space-y-3">
          <AdminTextField
            name="courseRetentionPolicy"
            label="강좌 신청 보유기간 문구"
            hint="신청 폼의 「보유기간」 안내에 그대로 나오고, 파기 기준도 같은 값을 씁니다."
            defaultValue={courseRetentionPolicy}
            required
            errors={fieldErrors.courseRetentionPolicy}
          />
          <AdminTextField
            name="eventRetentionPolicy"
            label="설명회 예약 보유기간 문구"
            hint="설명회 신청 폼의 「보유기간」 안내에 그대로 나옵니다."
            defaultValue={eventRetentionPolicy}
            required
            errors={fieldErrors.eventRetentionPolicy}
          />
          <AdminTextField
            name="consultationRetentionPolicy"
            label="입학진단·상담 신청 보유기간 문구"
            hint="상담 신청 기록의 파기 기준입니다. (AD-009)"
            defaultValue={consultationRetentionPolicy}
            required
            errors={fieldErrors.consultationRetentionPolicy}
          />
          <AdminTextField
            name="instructorRetentionPolicy"
            label="강사 지원 보유기간 문구"
            hint="강사 지원서의 「보유기간」 안내에 그대로 나옵니다. 파기하면 제출 서류 파일도 함께 지웁니다. (AD-011)"
            defaultValue={instructorRetentionPolicy}
            required
            errors={fieldErrors.instructorRetentionPolicy}
          />
          <AdminTextField
            name="smsRetentionPolicy"
            label="설명회 알림 신청 보유기간 문구"
            hint="홈 하단 알림 신청 폼의 「보유기간」 안내에 그대로 나옵니다. (AD-010)"
            defaultValue={smsRetentionPolicy}
            required
            errors={fieldErrors.smsRetentionPolicy}
          />
          <AdminCheckboxField
            name="automaticPurgeEnabled"
            label="자동 파기 사용"
            hint="기본값은 꺼짐입니다. 지금은 설정값만 저장하고 주기 실행은 붙어 있지 않습니다. 켜 두어도 자동으로 지워지지 않습니다."
            defaultChecked={automaticPurgeEnabled}
            errors={fieldErrors.automaticPurgeEnabled}
          />
        </div>
      )}
    </AdminActionForm>
  );
}

type PurgeCounts = {
  courseApplications: number;
  eventReservations: number;
  consultationApplications: number;
  instructorApplications: number;
  smsSubscriptions: number;
  removedFiles: number;
};

/**
 * 파기 실행. **먼저 미리 세기(dry-run)** 를 하고, 그 결과를 본 뒤에만 실제 파기 버튼이 열린다.
 * 실제 파기는 되돌릴 수 없고 기록에 남는다.
 */
export function PurgeRunPanel() {
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRunCounts, setDryRunCounts] = useState<PurgeCounts | null>(null);
  const [result, setResult] = useState<PurgeCounts | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function run(dryRun: boolean) {
    const formData = new FormData();
    formData.append("dryRun", dryRun ? "true" : "false");

    setPending(true);
    setError(null);

    const actionResult = await runPurgeAction(formData);
    setPending(false);

    if (!actionResult.ok) {
      setError(actionResult.message);
      return;
    }

    const counts: PurgeCounts = {
      courseApplications: actionResult.data.courseApplications,
      eventReservations: actionResult.data.eventReservations,
      consultationApplications: actionResult.data.consultationApplications,
      instructorApplications: actionResult.data.instructorApplications,
      smsSubscriptions: actionResult.data.smsSubscriptions,
      removedFiles: actionResult.data.removedFiles,
    };

    if (actionResult.data.dryRun) {
      setDryRunCounts(counts);
      setResult(null);
      return;
    }

    setResult(counts);
    setDryRunCounts(null);
    setConfirmOpen(false);
  }

  const totalToPurge = dryRunCounts
    ? dryRunCounts.courseApplications +
      dryRunCounts.eventReservations +
      dryRunCounts.consultationApplications +
      dryRunCounts.instructorApplications +
      dryRunCounts.smsSubscriptions
    : 0;

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-ink">
        <li>먼저 「파기 대상 미리 세기」로 몇 건이 지워질지 확인합니다.</li>
        <li>건수를 확인한 뒤에만 「실제 파기 실행」 버튼이 열립니다.</li>
        <li>
          실제 파기는 되돌릴 수 없습니다. 행은 남고 이름·연락처·학교 칸이 「파기됨」으로
          바뀝니다. 강사 지원은 제출 서류 파일도 함께 지웁니다. (AD-011)
        </li>
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(true)}
          className="rounded-md border border-line bg-canvas px-4 py-2 text-sm font-bold text-ink hover:bg-line/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "확인 중…" : "파기 대상 미리 세기"}
        </button>

        <button
          type="button"
          disabled={pending || dryRunCounts === null || totalToPurge === 0}
          onClick={() => setConfirmOpen(true)}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          실제 파기 실행
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800"
        >
          {error}
        </p>
      ) : null}

      {dryRunCounts ? (
        <p role="status" className="text-sm text-ink">
          미리 세기 결과: 강좌 신청{" "}
          <strong className="font-bold">{dryRunCounts.courseApplications}건</strong>,
          설명회 예약{" "}
          <strong className="font-bold">{dryRunCounts.eventReservations}건</strong>,
          입학진단·상담{" "}
          <strong className="font-bold">
            {dryRunCounts.consultationApplications}건
          </strong>
          , 강사 지원{" "}
          <strong className="font-bold">{dryRunCounts.instructorApplications}건</strong>
          , 설명회 알림 신청{" "}
          <strong className="font-bold">{dryRunCounts.smsSubscriptions}건</strong> 이
          파기 대상입니다.
          {totalToPurge === 0
            ? " 지금은 파기할 건이 없습니다."
            : " 이 숫자를 확인하고 실행해 주세요."}
        </p>
      ) : null}

      {result ? (
        <p
          role="status"
          className="rounded-md border border-brand/40 bg-brand/5 px-3 py-2 text-sm font-bold text-brand"
        >
          파기를 실행했습니다. 강좌 신청 {result.courseApplications}건, 설명회 예약{" "}
          {result.eventReservations}건, 입학진단·상담 {result.consultationApplications}
          건, 강사 지원 {result.instructorApplications}건(제출 서류{" "}
          {result.removedFiles}개 삭제), 설명회 알림 신청 {result.smsSubscriptions}건.
          실행 기록이 남았습니다.
        </p>
      ) : null}

      {confirmOpen ? (
        <ModalDialog open onClose={() => setConfirmOpen(false)} titleId={titleId}>
          <div className="px-6 py-6">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              개인정보를 지우시겠습니까?
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <p>
                파기 대상 시각이 지난 기록{" "}
                <strong className="font-bold text-ink">{totalToPurge}건</strong> 의
                이름·연락처·학교를 「파기됨」으로 바꿉니다.
              </p>
              <p>되돌릴 수 없습니다. 실행한 사실과 건수는 기록에 남습니다.</p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-md border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-canvas"
              >
                돌아가기
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(false)}
                className="flex-1 rounded-md bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "처리 중…" : "파기 실행하기"}
              </button>
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </div>
  );
}

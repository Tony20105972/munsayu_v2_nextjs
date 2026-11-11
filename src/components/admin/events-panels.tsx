"use client";

import {
  AdminCheckboxField,
  AdminFieldGrid,
  AdminInlineSelect,
  AdminSelectField,
  AdminTextField,
  type AdminOption,
} from "@/components/admin/fields";
import {
  AdminActionForm,
  AdminConfirmButton,
  AdminInlineForm,
} from "@/components/admin/forms";
import {
  changeEventStatusAction,
  createEventAction,
  createEventStatusOptionAction,
  deleteEventAction,
  updateEventAction,
} from "@/lib/actions/admin";

/** AD-003 ~ AD-005 설명회 관리 화면의 입력 부분. */

export type EventFormDefaults = {
  eventId?: string;
  campusId: string | null;
  managementCode: string;
  title: string;
  /** `datetime-local` 값 (한국 시간) */
  startsAt: string;
  venue: string | null;
  speaker: string | null;
  statusOptionId: string;
};

function EventFields({
  defaults,
  campusOptions,
  statusOptions,
  fieldErrors,
}: {
  defaults: EventFormDefaults;
  campusOptions: readonly AdminOption[];
  statusOptions: readonly AdminOption[];
  fieldErrors: Record<string, string[]>;
}) {
  return (
    <AdminFieldGrid>
      <AdminTextField
        name="title"
        label="설명회 제목"
        defaultValue={defaults.title}
        autoComplete="off"
        required
        errors={fieldErrors.title}
      />
      <AdminTextField
        name="managementCode"
        label="관리 코드"
        hint="자동으로 채워 넣지만 직접 고칠 수 있습니다. 같은 코드는 쓸 수 없습니다."
        defaultValue={defaults.managementCode}
        autoComplete="off"
        required
        errors={fieldErrors.managementCode}
      />
      <AdminTextField
        name="startsAt"
        label="개최 일시"
        type="datetime-local"
        hint="한국 시간으로 입력합니다."
        defaultValue={defaults.startsAt}
        required
        errors={fieldErrors.startsAt}
      />
      <AdminSelectField
        name="campusId"
        label="지점"
        options={campusOptions}
        defaultValue={defaults.campusId ?? ""}
        placeholder="지점 없음(온라인·공통)"
        errors={fieldErrors.campusId}
      />
      <AdminTextField
        name="venue"
        label="장소"
        defaultValue={defaults.venue ?? ""}
        autoComplete="off"
        errors={fieldErrors.venue}
      />
      <AdminTextField
        name="speaker"
        label="초청 연사"
        defaultValue={defaults.speaker ?? ""}
        autoComplete="off"
        errors={fieldErrors.speaker}
      />
      <AdminSelectField
        name="statusOptionId"
        label="상태"
        hint="상태는 관리자가 직접 바꿉니다. 인원이 차도 자동으로 바뀌지 않습니다."
        options={statusOptions}
        defaultValue={defaults.statusOptionId}
        required
        errors={fieldErrors.statusOptionId}
      />
    </AdminFieldGrid>
  );
}

export function EventCreateForm({
  defaults,
  campusOptions,
  statusOptions,
}: {
  defaults: EventFormDefaults;
  campusOptions: readonly AdminOption[];
  statusOptions: readonly AdminOption[];
}) {
  return (
    <AdminActionForm
      action={createEventAction}
      submitLabel="설명회 추가"
      successMessage="설명회를 추가했습니다."
      resetOnSuccess
    >
      {({ fieldErrors }) => (
        <EventFields
          defaults={defaults}
          campusOptions={campusOptions}
          statusOptions={statusOptions}
          fieldErrors={fieldErrors}
        />
      )}
    </AdminActionForm>
  );
}

export function EventEditForm({
  defaults,
  campusOptions,
  statusOptions,
}: {
  defaults: EventFormDefaults & { eventId: string };
  campusOptions: readonly AdminOption[];
  statusOptions: readonly AdminOption[];
}) {
  return (
    <AdminActionForm
      action={updateEventAction}
      submitLabel="설명회 저장"
      successMessage="설명회를 저장했습니다."
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="eventId" value={defaults.eventId} />
          <EventFields
            defaults={defaults}
            campusOptions={campusOptions}
            statusOptions={statusOptions}
            fieldErrors={fieldErrors}
          />
        </>
      )}
    </AdminActionForm>
  );
}

/** AD-004 목록에서 바로 상태를 바꾼다. (EV-ADM-03) */
export function EventStatusForm({
  eventId,
  statusOptionId,
  statusOptions,
}: {
  eventId: string;
  statusOptionId: string;
  statusOptions: readonly AdminOption[];
}) {
  return (
    <AdminInlineForm action={changeEventStatusAction} submitLabel="변경">
      <input type="hidden" name="eventId" value={eventId} />
      <AdminInlineSelect
        name="statusOptionId"
        label="설명회 상태"
        options={statusOptions}
        defaultValue={statusOptionId}
      />
    </AdminInlineForm>
  );
}

export function EventDeleteButton({
  eventId,
  title,
}: {
  eventId: string;
  title: string;
}) {
  return (
    <AdminConfirmButton
      action={deleteEventAction}
      hiddenFields={{ eventId }}
      buttonLabel="삭제"
      dialogTitle="설명회를 삭제하시겠습니까?"
      confirmLabel="삭제하기"
      dialogBody={
        <>
          <p>
            <strong className="font-bold text-ink">{title}</strong> 을 지웁니다.
          </p>
          <p>
            예약이 한 건이라도 있으면 삭제되지 않습니다. 그때는 상태를 「접수마감」으로
            바꿔 주세요.
          </p>
        </>
      }
    />
  );
}

/** AD-004 상태 목록 자체를 늘린다. 상태는 데이터로 관리한다. (ASM-001) */
export function EventStatusOptionCreateForm() {
  return (
    <AdminActionForm
      action={createEventStatusOptionAction}
      submitLabel="상태 추가"
      successMessage="상태를 추가했습니다."
      resetOnSuccess
    >
      {({ fieldErrors }) => (
        <AdminFieldGrid>
          <AdminTextField
            name="label"
            label="상태 이름"
            hint="예) 접수중, 마감임박, 접수마감"
            autoComplete="off"
            required
            errors={fieldErrors.label}
          />
          <AdminTextField
            name="sortOrder"
            label="정렬 순서"
            type="number"
            min={0}
            max={999}
            defaultValue="0"
            errors={fieldErrors.sortOrder}
          />
          <AdminCheckboxField
            name="isClosed"
            label="이 상태에서는 새 예약을 받지 않음"
            hint="공개 화면에서 신청 버튼이 「접수마감」으로 바뀌고 서버도 신청을 막습니다."
            errors={fieldErrors.isClosed}
          />
        </AdminFieldGrid>
      )}
    </AdminActionForm>
  );
}

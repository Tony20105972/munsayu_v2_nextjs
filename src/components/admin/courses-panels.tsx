"use client";

import {
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
  createCourseAction,
  deleteCourseAction,
  setCourseIntakeAction,
  updateCourseAction,
} from "@/lib/actions/admin";

/** AD-007 시간표·강좌 관리 화면의 입력 부분. */

const INTAKE_OPTIONS: AdminOption[] = [
  { value: "true", label: "접수중" },
  { value: "false", label: "접수마감" },
];

export type CourseFormDefaults = {
  campusId: string;
  title: string;
  sectionTitle: string | null;
  gradeTitle: string | null;
  scheduleText: string | null;
  /** `date` 입력값 (한국 시간 기준 날짜) */
  startDate: string;
  displayOrder: number;
  intakeOpen: boolean;
};

function CourseFields({
  defaults,
  campusOptions,
  fieldErrors,
}: {
  defaults: CourseFormDefaults;
  campusOptions: readonly AdminOption[];
  fieldErrors: Record<string, string[]>;
}) {
  return (
    <AdminFieldGrid>
      <AdminSelectField
        name="campusId"
        label="지점"
        options={campusOptions}
        defaultValue={defaults.campusId}
        placeholder="지점 선택"
        required
        errors={fieldErrors.campusId}
      />
      <AdminTextField
        name="sectionTitle"
        label="구분 섹션"
        hint="예) 정규강좌, 특강, 진단평가"
        defaultValue={defaults.sectionTitle ?? ""}
        autoComplete="off"
        errors={fieldErrors.sectionTitle}
      />
      <AdminTextField
        name="gradeTitle"
        label="학년 대분류"
        hint="같은 값끼리 공개 시간표에서 한 묶음으로 보입니다. 예) 초등학교 4학년"
        defaultValue={defaults.gradeTitle ?? ""}
        autoComplete="off"
        errors={fieldErrors.gradeTitle}
      />
      <AdminTextField
        name="title"
        label="강좌 제목"
        defaultValue={defaults.title}
        autoComplete="off"
        required
        errors={fieldErrors.title}
      />
      <AdminTextField
        name="scheduleText"
        label="강의시간"
        hint="예) 화,수,목,금 15/18시"
        defaultValue={defaults.scheduleText ?? ""}
        autoComplete="off"
        errors={fieldErrors.scheduleText}
      />
      <AdminTextField
        name="startDate"
        label="개강일"
        type="date"
        defaultValue={defaults.startDate}
        errors={fieldErrors.startDate}
      />
      <AdminTextField
        name="displayOrder"
        label="출력 순서"
        type="number"
        min={0}
        max={9999}
        defaultValue={String(defaults.displayOrder)}
        hint="숫자가 작을수록 공개 시간표에서 먼저 보입니다."
        errors={fieldErrors.displayOrder}
      />
      <AdminSelectField
        name="intakeOpen"
        label="접수 상태"
        hint="관리자가 직접 바꿉니다. 정원으로 자동 마감하지 않습니다."
        options={INTAKE_OPTIONS}
        defaultValue={defaults.intakeOpen ? "true" : "false"}
        required
        errors={fieldErrors.intakeOpen}
      />
    </AdminFieldGrid>
  );
}

export function CourseCreateForm({
  defaults,
  campusOptions,
}: {
  defaults: CourseFormDefaults;
  campusOptions: readonly AdminOption[];
}) {
  return (
    <AdminActionForm
      action={createCourseAction}
      submitLabel="강좌 추가"
      successMessage="강좌를 추가했습니다."
      resetOnSuccess
    >
      {({ fieldErrors }) => (
        <CourseFields
          defaults={defaults}
          campusOptions={campusOptions}
          fieldErrors={fieldErrors}
        />
      )}
    </AdminActionForm>
  );
}

export function CourseEditForm({
  courseId,
  defaults,
  campusOptions,
}: {
  courseId: string;
  defaults: CourseFormDefaults;
  campusOptions: readonly AdminOption[];
}) {
  return (
    <AdminActionForm
      action={updateCourseAction}
      submitLabel="강좌 저장"
      successMessage="강좌를 저장했습니다."
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="courseId" value={courseId} />
          <CourseFields
            defaults={defaults}
            campusOptions={campusOptions}
            fieldErrors={fieldErrors}
          />
        </>
      )}
    </AdminActionForm>
  );
}

/** BZ-001 접수중 / 접수마감 수동 전환. 자동 전환은 없다. (Q-ADM-05) */
export function CourseIntakeForm({
  courseId,
  intakeOpen,
}: {
  courseId: string;
  intakeOpen: boolean;
}) {
  return (
    <AdminInlineForm action={setCourseIntakeAction} submitLabel="변경">
      <input type="hidden" name="courseId" value={courseId} />
      <AdminInlineSelect
        name="intakeOpen"
        label="접수 상태"
        options={INTAKE_OPTIONS}
        defaultValue={intakeOpen ? "true" : "false"}
      />
    </AdminInlineForm>
  );
}

export function CourseDeleteButton({
  courseId,
  title,
  applicationCount,
}: {
  courseId: string;
  title: string;
  applicationCount: number;
}) {
  return (
    <AdminConfirmButton
      action={deleteCourseAction}
      hiddenFields={{ courseId }}
      buttonLabel="삭제"
      dialogTitle="강좌를 삭제하시겠습니까?"
      confirmLabel="삭제하기"
      dialogBody={
        <>
          <p>
            <strong className="font-bold text-ink">{title}</strong> 을 지웁니다.
          </p>
          {applicationCount > 0 ? (
            <p>
              이 강좌에는 신청이 {applicationCount}건 있어 삭제되지 않습니다. 신청
              기록을 함께 잃지 않기 위한 제한입니다. 「접수마감」으로 바꿔 주세요.
            </p>
          ) : (
            <p>신청 기록이 없으므로 지울 수 있습니다. 되돌릴 수 없습니다.</p>
          )}
        </>
      }
    />
  );
}

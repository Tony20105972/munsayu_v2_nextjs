"use client";

import {
  AdminFieldGrid,
  AdminInlineNumber,
  AdminSelectField,
  AdminTextArea,
  AdminTextField,
  type AdminOption,
} from "@/components/admin/fields";
import {
  AdminActionForm,
  AdminConfirmButton,
  AdminInlineForm,
} from "@/components/admin/forms";
import {
  createInstructorAction,
  createTeamAction,
  deleteInstructorAction,
  removeTeamMembershipAction,
  setTeamMembershipAction,
  updateInstructorAction,
} from "@/lib/actions/admin";

/** AD-006 강사 관리 화면의 입력 부분. */

const BIO_HINT = "한 줄에 한 항목씩 적으면 공개 화면에서 목록으로 보입니다.";

export function InstructorCreateForm() {
  return (
    <AdminActionForm
      action={createInstructorAction}
      submitLabel="강사 추가"
      successMessage="강사를 추가했습니다. 소속 팀은 아래에서 지정합니다."
      resetOnSuccess
    >
      {({ fieldErrors }) => (
        <AdminFieldGrid>
          <AdminTextField
            name="name"
            label="성명"
            autoComplete="off"
            required
            errors={fieldErrors.name}
          />
          <AdminTextField
            name="profileCode"
            label="강사 고유 코드"
            hint="같은 코드는 쓸 수 없습니다. 예) tch-a"
            autoComplete="off"
            required
            errors={fieldErrors.profileCode}
          />
          <div className="sm:col-span-2 lg:col-span-3">
            <AdminTextArea
              name="bio"
              label="직책 및 주요 약력"
              hint={BIO_HINT}
              errors={fieldErrors.bio}
            />
          </div>
        </AdminFieldGrid>
      )}
    </AdminActionForm>
  );
}

export function InstructorEditForm({
  instructorId,
  name,
  profileCode,
  bio,
}: {
  instructorId: string;
  name: string;
  profileCode: string;
  bio: string | null;
}) {
  return (
    <AdminActionForm
      action={updateInstructorAction}
      submitLabel="강사 저장"
      successMessage="강사 정보를 저장했습니다."
    >
      {({ fieldErrors }) => (
        <>
          <input type="hidden" name="instructorId" value={instructorId} />
          <AdminFieldGrid>
            <AdminTextField
              name="name"
              label="성명"
              defaultValue={name}
              autoComplete="off"
              required
              errors={fieldErrors.name}
            />
            <AdminTextField
              name="profileCode"
              label="강사 고유 코드"
              defaultValue={profileCode}
              autoComplete="off"
              required
              errors={fieldErrors.profileCode}
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <AdminTextArea
                name="bio"
                label="직책 및 주요 약력"
                hint={BIO_HINT}
                defaultValue={bio ?? ""}
                errors={fieldErrors.bio}
              />
            </div>
          </AdminFieldGrid>
        </>
      )}
    </AdminActionForm>
  );
}

export function InstructorDeleteButton({
  instructorId,
  name,
}: {
  instructorId: string;
  name: string;
}) {
  return (
    <AdminConfirmButton
      action={deleteInstructorAction}
      hiddenFields={{ instructorId }}
      buttonLabel="강사 삭제"
      dialogTitle="강사를 삭제하시겠습니까?"
      confirmLabel="삭제하기"
      dialogBody={
        <>
          <p>
            <strong className="font-bold text-ink">{name}</strong> 강사와 그 팀 소속을
            모두 지웁니다.
          </p>
          <p>공개 강사진 화면에서도 바로 사라집니다. 되돌릴 수 없습니다.</p>
        </>
      }
    />
  );
}

export function TeamCreateForm() {
  return (
    <AdminActionForm
      action={createTeamAction}
      submitLabel="팀 추가"
      successMessage="팀을 추가했습니다."
      resetOnSuccess
    >
      {({ fieldErrors }) => (
        <AdminFieldGrid>
          <AdminTextField
            name="name"
            label="팀 이름"
            hint="예) 대치팀, 분당팀, 컨설팅팀"
            autoComplete="off"
            required
            errors={fieldErrors.name}
          />
        </AdminFieldGrid>
      )}
    </AdminActionForm>
  );
}

/**
 * 소속 추가·순서 변경. 같은 강사를 여러 팀에 넣을 수 있고 팀마다 순서를 따로 둔다.
 * 이미 있는 (강사, 팀) 짝에 다시 저장하면 노출 순서만 바뀐다. (ASM-003)
 */
export function TeamMembershipForm({
  instructorOptions,
  teamOptions,
}: {
  instructorOptions: readonly AdminOption[];
  teamOptions: readonly AdminOption[];
}) {
  return (
    <AdminActionForm
      action={setTeamMembershipAction}
      submitLabel="소속 저장"
      successMessage="소속과 노출 순서를 저장했습니다."
    >
      {({ fieldErrors }) => (
        <AdminFieldGrid>
          <AdminSelectField
            name="instructorId"
            label="강사"
            options={instructorOptions}
            placeholder="강사 선택"
            required
            errors={fieldErrors.instructorId}
          />
          <AdminSelectField
            name="teamId"
            label="팀"
            options={teamOptions}
            placeholder="팀 선택"
            required
            errors={fieldErrors.teamId}
          />
          <AdminTextField
            name="displayOrder"
            label="이 팀에서의 노출 순서"
            type="number"
            min={0}
            max={999}
            defaultValue="0"
            hint="숫자가 작을수록 먼저 보입니다. 팀마다 따로 둡니다."
            errors={fieldErrors.displayOrder}
          />
        </AdminFieldGrid>
      )}
    </AdminActionForm>
  );
}

/** 한 줄에서 팀별 노출 순서만 고친다. */
export function MembershipOrderForm({
  instructorId,
  teamId,
  displayOrder,
}: {
  instructorId: string;
  teamId: string;
  displayOrder: number;
}) {
  return (
    <AdminInlineForm action={setTeamMembershipAction} submitLabel="순서 저장">
      <input type="hidden" name="instructorId" value={instructorId} />
      <input type="hidden" name="teamId" value={teamId} />
      <AdminInlineNumber
        name="displayOrder"
        label="노출 순서"
        defaultValue={displayOrder}
      />
    </AdminInlineForm>
  );
}

export function MembershipRemoveButton({
  instructorId,
  teamId,
  instructorName,
  teamName,
}: {
  instructorId: string;
  teamId: string;
  instructorName: string;
  teamName: string;
}) {
  return (
    <AdminConfirmButton
      action={removeTeamMembershipAction}
      hiddenFields={{ instructorId, teamId }}
      buttonLabel="소속 해제"
      dialogTitle="팀 소속을 해제하시겠습니까?"
      confirmLabel="해제하기"
      tone="normal"
      dialogBody={
        <>
          <p>
            <strong className="font-bold text-ink">{instructorName}</strong> 를{" "}
            <strong className="font-bold text-ink">{teamName}</strong> 에서 뺍니다.
          </p>
          <p>강사 자체는 지워지지 않습니다. 다른 팀 소속은 그대로 남습니다.</p>
        </>
      }
    />
  );
}

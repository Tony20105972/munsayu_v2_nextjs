"use client";

import {
  AdminFieldGrid,
  AdminInlineSelect,
  AdminTextField,
} from "@/components/admin/fields";
import {
  AdminActionForm,
  AdminConfirmButton,
  AdminInlineForm,
} from "@/components/admin/forms";
import {
  changeMemberStatusAction,
  createAdminAccountAction,
  deleteAdminAccountAction,
} from "@/lib/actions/admin";
import { ACCOUNT_STATUSES, type AccountStatus } from "@/lib/contracts";

/** AD-002 회원 관리 화면의 입력 부분. 서버 자료는 페이지가 넘겨 준다. */

export const STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: "이용 중",
  BLOCKED: "차단",
  WITHDRAWN: "탈퇴",
};

const STATUS_OPTIONS = ACCOUNT_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABEL[status],
}));

/** 한 줄에서 회원 상태를 바꾼다. 차단·탈퇴로 바꾸면 그 회원의 로그인 세션이 끊긴다. */
export function MemberStatusForm({
  userId,
  status,
}: {
  userId: string;
  status: AccountStatus;
}) {
  return (
    <AdminInlineForm action={changeMemberStatusAction} submitLabel="변경">
      <input type="hidden" name="userId" value={userId} />
      <AdminInlineSelect
        name="status"
        label="회원 상태"
        options={STATUS_OPTIONS}
        defaultValue={status}
      />
    </AdminInlineForm>
  );
}

export function AdminAccountCreateForm() {
  return (
    <AdminActionForm
      action={createAdminAccountAction}
      submitLabel="관리자 계정 추가"
      successMessage="관리자 계정을 추가했습니다. 추가 기록이 남습니다."
      resetOnSuccess
    >
      {({ fieldErrors }) => (
        <AdminFieldGrid>
          <AdminTextField
            name="loginId"
            label="아이디"
            hint="영문 소문자·숫자·밑줄 3~20자"
            autoComplete="off"
            required
            errors={fieldErrors.loginId}
          />
          <AdminTextField
            name="password"
            label="비밀번호"
            type="password"
            hint="영문과 숫자를 함께 넣어 10자 이상"
            autoComplete="new-password"
            required
            errors={fieldErrors.password}
          />
          <AdminTextField
            name="name"
            label="이름"
            autoComplete="off"
            required
            errors={fieldErrors.name}
          />
          <AdminTextField
            name="email"
            label="이메일"
            type="email"
            autoComplete="off"
            required
            errors={fieldErrors.email}
          />
          <AdminTextField
            name="phone"
            label="휴대전화번호"
            type="tel"
            placeholder="010-0000-0000"
            autoComplete="off"
            required
            errors={fieldErrors.phone}
          />
        </AdminFieldGrid>
      )}
    </AdminActionForm>
  );
}

export function AdminAccountDeleteButton({
  userId,
  loginId,
  isSelf,
}: {
  userId: string;
  loginId: string;
  isSelf: boolean;
}) {
  if (isSelf) {
    return (
      <span className="text-xs text-muted">
        지금 로그인한 계정입니다. 자기 계정은 삭제할 수 없습니다.
      </span>
    );
  }

  return (
    <AdminConfirmButton
      action={deleteAdminAccountAction}
      hiddenFields={{ userId }}
      buttonLabel="삭제"
      dialogTitle="관리자 계정을 삭제하시겠습니까?"
      confirmLabel="삭제하기"
      dialogBody={
        <>
          <p>
            아이디 <strong className="font-bold text-ink">{loginId}</strong> 계정을
            지웁니다. 되돌릴 수 없습니다.
          </p>
          <p>삭제한 사실은 누가 언제 했는지 기록에 남습니다.</p>
          <p>
            관리자가 한 명만 남은 경우에는 삭제되지 않습니다. 자기 계정도 삭제할 수
            없습니다.
          </p>
        </>
      }
    />
  );
}

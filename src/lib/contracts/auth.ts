import { z } from "zod";
import { personNameSchema, phoneSchema } from "./common";

/**
 * FM-003 공개 회원 lifecycle과 AD-001 관리자 로그인의 입력 계약.
 * 회원은 가입·로그인 유지·아이디/비밀번호 찾기·정보 수정·탈퇴를 한다. 신청은 비회원도 할 수 있다. (ASM-002)
 * 본인인증과 그누보드 전용 항목(포인트·성인인증·접근그룹)은 제공하지 않는다. (BLUEPRINT 7장)
 */

export const loginIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9_]+$/, {
    message: "아이디는 영문 소문자, 숫자, 밑줄만 쓸 수 있습니다.",
  });

export const passwordSchema = z
  .string()
  .min(10)
  .max(72)
  .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), {
    message: "비밀번호는 영문과 숫자를 함께 넣어야 합니다.",
  });

export const emailSchema = z.string().trim().toLowerCase().email().max(120);

export const registerSchema = z
  .object({
    loginId: loginIdSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    name: personNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    /** 회원가입약관 동의. 레거시 가입 1단계에 약관·개인정보 동의가 있다. (EV-0007) */
    termsConsent: z.literal(true, {
      message: "이용약관에 동의해야 가입할 수 있습니다.",
    }),
    privacyConsent: z.literal(true, {
      message: "개인정보 수집 및 이용에 동의해야 가입할 수 있습니다.",
    }),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 서로 다릅니다.",
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  loginId: loginIdSchema,
  password: z.string().min(1),
  /** 레거시 로그인 화면의 `로그인 상태 유지` 체크박스 (EV-0007) */
  rememberMe: z.coerce.boolean().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** 아이디 찾기: 이름과 이메일이 맞으면 아이디를 메일로 보낸다. 화면에는 노출하지 않는다. */
export const findLoginIdSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
});
export type FindLoginIdInput = z.infer<typeof findLoginIdSchema>;

/** 비밀번호 찾기: 재설정 링크를 메일로 보낸다. 계정 존재 여부는 응답으로 알려 주지 않는다. */
export const requestPasswordResetSchema = z.object({
  loginId: loginIdSchema,
  email: emailSchema,
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

/** 재설정 토큰은 1회용이고 만료 시간이 있다. */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 서로 다릅니다.",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  phone: phoneSchema,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 서로 다릅니다.",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** 탈퇴는 비밀번호를 다시 확인한다. 기록은 물리 삭제하지 않고 상태로 관리한다. (BLUEPRINT 6장) */
export const withdrawSchema = z.object({
  password: z.string().min(1),
  confirm: z.literal(true, { message: "탈퇴에 동의해야 진행할 수 있습니다." }),
});
export type WithdrawInput = z.infer<typeof withdrawSchema>;

export const USER_ROLES = ["MEMBER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ["ACTIVE", "BLOCKED", "WITHDRAWN"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** 세션에서 화면으로 내려 주는 최소 정보. */
export type SessionUser = {
  id: string;
  loginId: string;
  name: string;
  role: UserRole;
};

/** 로그인 시도 제한 기준. (BLUEPRINT 7장) */
export const LOGIN_ATTEMPT_LIMIT = {
  maxAttempts: 5,
  windowMinutes: 10,
  lockMinutes: 15,
} as const;

/** 비밀번호 재설정 토큰 유효 시간. */
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;

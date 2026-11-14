"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

/**
 * 관리자 폼의 입력 조각. 공개 화면보다 촘촘하게 쓰지만 레이블·오류 연결 규칙은 같다.
 * 모든 입력에 `<label for>` 이 붙고 오류는 `aria-describedby` 로 연결한다.
 */

const CONTROL =
  "w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink";

function FieldErrorText({ id, errors }: { id: string; errors?: readonly string[] }) {
  if (!errors || errors.length === 0) {
    return null;
  }
  return (
    <p id={id} className="mt-1 text-xs font-bold text-red-700">
      {errors.join(" ")}
    </p>
  );
}

type Shared = {
  name: string;
  label: string;
  hint?: string;
  errors?: readonly string[];
  required?: boolean;
};

export function AdminTextField({
  name,
  label,
  hint,
  errors,
  required,
  defaultValue,
  type = "text",
  ...rest
}: Shared & {
  defaultValue?: string;
} & Pick<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "placeholder" | "min" | "max" | "step" | "inputMode" | "autoComplete"
  >) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = Boolean(errors && errors.length > 0);

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-ink">
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      <input
        {...rest}
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`${CONTROL} mt-1`}
      />
      <FieldErrorText id={errorId} errors={errors} />
    </div>
  );
}

export function AdminTextArea({
  name,
  label,
  hint,
  errors,
  required,
  defaultValue,
  rows = 4,
}: Shared & { defaultValue?: string; rows?: number }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = Boolean(errors && errors.length > 0);

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-ink">
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`${CONTROL} mt-1`}
      />
      <FieldErrorText id={errorId} errors={errors} />
    </div>
  );
}

export type AdminOption = { value: string; label: string };

export function AdminSelectField({
  name,
  label,
  hint,
  errors,
  required,
  options,
  defaultValue,
  placeholder,
}: Shared & {
  options: readonly AdminOption[];
  defaultValue?: string;
  placeholder?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = Boolean(errors && errors.length > 0);

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-ink">
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`${CONTROL} mt-1`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldErrorText id={errorId} errors={errors} />
    </div>
  );
}

export function AdminCheckboxField({
  name,
  label,
  hint,
  errors,
  defaultChecked,
}: Omit<Shared, "required"> & { defaultChecked?: boolean }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = Boolean(errors && errors.length > 0);

  return (
    <div>
      <div className="flex items-start gap-2">
        <input
          id={id}
          name={name}
          type="checkbox"
          value="true"
          defaultChecked={defaultChecked}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className="mt-0.5 size-4 accent-brand"
        />
        <label htmlFor={id} className="text-xs font-bold text-ink">
          {label}
        </label>
      </div>
      {hint ? <p className="mt-0.5 pl-6 text-xs text-muted">{hint}</p> : null}
      <FieldErrorText id={errorId} errors={errors} />
    </div>
  );
}

/** 줄 안에서 쓰는 작은 선택 상자. 레이블은 눈에 보이지 않게 두되 반드시 연결한다. */
export function AdminInlineSelect({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: readonly AdminOption[];
  defaultValue?: string;
}) {
  const id = useId();

  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}

/** 줄 안에서 쓰는 작은 글자 입력. 레이블은 눈에 보이지 않게 두되 반드시 연결한다. */
export function AdminInlineText({
  name,
  label,
  defaultValue,
  maxLength,
  widthClass = "w-56",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  maxLength?: number;
  widthClass?: string;
}) {
  const id = useId();

  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        defaultValue={defaultValue}
        maxLength={maxLength}
        className={`${widthClass} rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-ink`}
      />
    </>
  );
}

/** 줄 안에서 쓰는 작은 숫자 입력. */
export function AdminInlineNumber({
  name,
  label,
  defaultValue,
  min = 0,
  max = 999,
}: {
  name: string;
  label: string;
  defaultValue?: number;
  min?: number;
  max?: number;
}) {
  const id = useId();

  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        min={min}
        max={max}
        defaultValue={defaultValue}
        className="w-16 rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-ink"
      />
    </>
  );
}

export function AdminFieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

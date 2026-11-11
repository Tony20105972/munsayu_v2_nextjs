import type { InputHTMLAttributes, ReactNode } from "react";

const CONTROL_CLASS =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted/70";

type FieldShellProps = {
  controlId: string;
  errorId: string;
  label: string;
  required?: boolean;
  hint?: string;
  errors?: readonly string[];
  children: ReactNode;
};

function RequiredMark() {
  return (
    <span className="ml-1 text-accent">
      <span aria-hidden="true">*</span>
      <span className="sr-only">필수</span>
    </span>
  );
}

function FieldErrors({
  errorId,
  errors,
}: {
  errorId: string;
  errors?: readonly string[];
}) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <p id={errorId} className="mt-1.5 text-xs font-bold text-red-700">
      {errors.join(" ")}
    </p>
  );
}

function FieldShell({
  controlId,
  errorId,
  label,
  required,
  hint,
  errors,
  children,
}: FieldShellProps) {
  return (
    <div>
      <label htmlFor={controlId} className="block text-sm font-bold text-ink">
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
      <FieldErrors errorId={errorId} errors={errors} />
    </div>
  );
}

type TextFieldProps = {
  controlId: string;
  errorId: string;
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  errors?: readonly string[];
  defaultValue?: string;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "placeholder" | "autoComplete" | "inputMode" | "maxLength"
>;

export function TextField({
  controlId,
  errorId,
  name,
  label,
  required,
  hint,
  errors,
  defaultValue,
  type = "text",
  ...inputProps
}: TextFieldProps) {
  const hasError = Boolean(errors && errors.length > 0);

  return (
    <FieldShell
      controlId={controlId}
      errorId={errorId}
      label={label}
      required={required}
      hint={hint}
      errors={errors}
    >
      <input
        {...inputProps}
        id={controlId}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={CONTROL_CLASS}
      />
    </FieldShell>
  );
}

type SelectFieldProps = {
  controlId: string;
  errorId: string;
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  errors?: readonly string[];
  defaultValue?: string;
  placeholder?: string;
};

export function SelectField({
  controlId,
  errorId,
  name,
  label,
  options,
  required,
  hint,
  errors,
  defaultValue,
  placeholder,
}: SelectFieldProps) {
  const hasError = Boolean(errors && errors.length > 0);

  return (
    <FieldShell
      controlId={controlId}
      errorId={errorId}
      label={label}
      required={required}
      hint={hint}
      errors={errors}
    >
      <select
        id={controlId}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={CONTROL_CLASS}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type RadioGroupFieldProps = {
  name: string;
  legend: string;
  errorId: string;
  options: readonly { value: string; label: string }[];
  required?: boolean;
  errors?: readonly string[];
  defaultValue?: string;
  idPrefix: string;
};

export function RadioGroupField({
  name,
  legend,
  errorId,
  options,
  required,
  errors,
  defaultValue,
  idPrefix,
}: RadioGroupFieldProps) {
  const hasError = Boolean(errors && errors.length > 0);

  return (
    <fieldset
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? errorId : undefined}
    >
      <legend className="text-sm font-bold text-ink">
        {legend}
        {required ? <RequiredMark /> : null}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const optionId = `${idPrefix}-${option.value}`;

          return (
            <div key={option.value}>
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                defaultChecked={defaultValue === option.value}
                className="peer sr-only"
              />
              <label
                htmlFor={optionId}
                className="inline-flex cursor-pointer items-center rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
      <FieldErrors errorId={errorId} errors={errors} />
    </fieldset>
  );
}

type CheckboxFieldProps = {
  controlId: string;
  errorId: string;
  name: string;
  label: ReactNode;
  errors?: readonly string[];
  defaultChecked?: boolean;
  /** 제어 모드로 쓰려면 checked 와 onChange 를 함께 넘긴다. */
  checked?: boolean;
  onChange?: (checked: boolean) => void;
};

export function CheckboxField({
  controlId,
  errorId,
  name,
  label,
  errors,
  defaultChecked,
  checked,
  onChange,
}: CheckboxFieldProps) {
  const hasError = Boolean(errors && errors.length > 0);
  const controlled = checked !== undefined;

  return (
    <div>
      <div className="flex items-start gap-2">
        <input
          id={controlId}
          name={name}
          type="checkbox"
          defaultChecked={controlled ? undefined : defaultChecked}
          checked={checked}
          onChange={
            onChange ? (event) => onChange(event.currentTarget.checked) : undefined
          }
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className="mt-0.5 size-4 accent-brand"
        />
        <label htmlFor={controlId} className="text-sm text-ink">
          {label}
        </label>
      </div>
      <FieldErrors errorId={errorId} errors={errors} />
    </div>
  );
}

type SubmitButtonProps = {
  children: ReactNode;
  pending?: boolean;
  variant?: "primary" | "secondary";
};

export function SubmitButton({
  children,
  pending = false,
  variant = "primary",
}: SubmitButtonProps) {
  const base =
    "w-full rounded-md px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60";
  const tone =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-dark"
      : "border border-line bg-surface text-ink hover:bg-canvas";

  return (
    <button type="submit" disabled={pending} className={`${base} ${tone}`}>
      {pending ? "처리 중…" : children}
    </button>
  );
}

type StatusMessageProps = {
  tone: "success" | "error" | "info";
  children: ReactNode;
};

export function StatusMessage({ tone, children }: StatusMessageProps) {
  const toneClass =
    tone === "success"
      ? "border-brand/40 bg-brand/5 text-brand"
      : tone === "error"
        ? "border-red-300 bg-red-50 text-red-800"
        : "border-line bg-canvas text-ink";

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm ${toneClass}`}
    >
      {children}
    </p>
  );
}

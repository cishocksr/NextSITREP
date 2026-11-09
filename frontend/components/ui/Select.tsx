"use client";

import { forwardRef, type SelectHTMLAttributes, useId } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      className = "",
      id,
      "aria-describedby": describedBy,
      "aria-invalid": invalid,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const messageId = `${selectId}-message`;
    const description =
      [describedBy, error ? messageId : undefined].filter(Boolean).join(" ") ||
      undefined;

    return (
      <div className="flex min-w-0 flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-describedby={description}
          aria-invalid={error ? true : invalid}
          className={[
            "min-w-0 w-full rounded-lg border px-3 py-2 text-sm text-slate-900",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:bg-slate-50 disabled:cursor-not-allowed",
            "bg-white cursor-pointer",
            error ? "border-red-600" : "border-slate-500",
            className,
          ].join(" ")}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={messageId} className="text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

"use client";

import { forwardRef, type InputHTMLAttributes, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      className = "",
      id,
      "aria-describedby": describedBy,
      "aria-invalid": invalid,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const messageId = `${inputId}-message`;
    const description =
      [describedBy, error || hint ? messageId : undefined]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className="flex min-w-0 flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={description}
          aria-invalid={error ? true : invalid}
          className={[
            "min-w-0 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed",
            error
              ? "border-red-600 bg-red-50 focus:ring-red-600"
              : "border-slate-500 bg-white",
            className,
          ].join(" ")}
          {...props}
        />
        {error && (
          <p id={messageId} className="text-xs text-red-700">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={messageId} className="text-xs text-slate-600">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

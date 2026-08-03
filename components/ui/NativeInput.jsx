"use client";

import { cx } from "@/components/ui/classNames";
import { forwardRef, useId } from "react";

const radiusClasses = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  full: "rounded-full",
};

const NativeInput = forwardRef(function NativeInput(
  {
    className = "",
    classNames = {},
    disabled = false,
    endContent,
    errorMessage,
    id,
    isDisabled = false,
    isInvalid = false,
    label,
    onChange,
    onValueChange,
    radius = "lg",
    startContent,
    type = "text",
    value,
    variant = "bordered",
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const resolvedDisabled = disabled || isDisabled;
  const showError = isInvalid && errorMessage;

  return (
    <div className={cx("space-y-1", className)}>
      {label ? (
        <label
          htmlFor={inputId}
          className={cx("block text-xs font-semibold text-gray-700", classNames.label)}
        >
          {label}
        </label>
      ) : null}
      <div
        className={cx(
          "flex min-h-10 items-center gap-2 border bg-white px-3 shadow-sm transition focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
          variant === "bordered" ? "border-gray-200" : "border-transparent",
          radiusClasses[radius] ?? radiusClasses.lg,
          isInvalid ? "border-rose-500 bg-rose-50/40 focus-within:border-rose-500" : "",
          resolvedDisabled ? "bg-gray-50 text-gray-400" : "",
          classNames.inputWrapper
        )}
      >
        {startContent}
        <input
          {...props}
          id={inputId}
          ref={ref}
          type={type}
          value={value}
          disabled={resolvedDisabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={showError ? `${inputId}-error` : undefined}
          onChange={(event) => {
            onChange?.(event);
            onValueChange?.(event.target.value);
          }}
          className={cx(
            "min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:text-gray-400",
            classNames.input
          )}
        />
        {endContent}
      </div>
      {showError ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-rose-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
});

export default NativeInput;

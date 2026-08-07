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
  const hasLabel = Boolean(label);

  return (
    <div className={cx("space-y-1", className)}>
      <div
        className={cx(
          "group flex items-center gap-2 border bg-white px-3 shadow-sm transition duration-200 ease-out focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)] motion-reduce:transition-none",
          hasLabel ? "min-h-14 py-2" : "min-h-10 py-1",
          variant === "bordered" ? "border-gray-200" : "border-transparent",
          radiusClasses[radius] ?? radiusClasses.lg,
          isInvalid ? "border-rose-500 bg-rose-50/40 focus-within:border-rose-500" : "",
          resolvedDisabled ? "bg-gray-50 text-gray-400" : "",
          classNames.inputWrapper
        )}
      >
        {startContent}
        <div className="min-w-0 flex-1">
          {hasLabel ? (
            <label
              htmlFor={inputId}
              className={cx(
                "block truncate text-[11px] font-semibold leading-4 text-gray-500 transition duration-200 ease-out group-focus-within:text-[var(--stocksense-brand)] motion-reduce:transition-none",
                isInvalid ? "text-rose-600 group-focus-within:text-rose-600" : "",
                resolvedDisabled ? "text-gray-400" : "",
                classNames.label
              )}
            >
              {label}
            </label>
          ) : null}
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
              "block w-full min-w-0 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 disabled:text-gray-400",
              hasLabel ? "h-5 leading-5" : "h-7 leading-7",
              classNames.input
            )}
          />
        </div>
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

"use client";

import { cx } from "@/components/ui/classNames";
import { FaSpinner } from "react-icons/fa";

const variantClasses = {
  solid: {
    default: "bg-[var(--stocksense-brand)] text-white",
    primary: "bg-[var(--stocksense-brand)] text-white",
    danger: "bg-rose-600 text-white",
  },
  flat: {
    default: "border border-gray-200 bg-gray-50 text-gray-700",
    primary:
      "border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]",
    danger: "border border-rose-200 bg-rose-50 text-rose-700",
  },
  bordered: {
    default: "border border-gray-200 bg-white text-gray-700",
    primary:
      "border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]",
    danger: "border border-rose-200 bg-white text-rose-700",
  },
  light: {
    default: "bg-transparent text-gray-700 hover:bg-gray-100",
    primary: "bg-transparent text-[var(--stocksense-brand)] hover:bg-[var(--stocksense-brand-soft)]",
    danger: "bg-transparent text-rose-700 hover:bg-rose-50",
  },
};

const sizeClasses = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

const radiusClasses = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  full: "rounded-full",
};

export default function NativeButton({
  as,
  children,
  className = "",
  color = "default",
  disabled = false,
  endContent,
  isDisabled = false,
  isIconOnly = false,
  isLoading = false,
  onClick,
  onPress,
  radius = "lg",
  size = "md",
  startContent,
  type = "button",
  variant = "solid",
  ...props
}) {
  const resolvedDisabled = disabled || isDisabled || isLoading;
  const resolvedColor = color === "danger" ? "danger" : color === "primary" ? "primary" : "default";
  const resolvedVariant = variantClasses[variant] ? variant : "solid";
  const Component = as || "button";
  const isNativeButton = Component === "button";

  return (
    <Component
      {...props}
      {...(isNativeButton ? { type, disabled: resolvedDisabled } : {})}
      {...(!isNativeButton && resolvedDisabled
        ? { "aria-disabled": true, tabIndex: -1 }
        : {})}
      aria-busy={isLoading || undefined}
      onClick={(event) => {
        if (resolvedDisabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
        if (!event.defaultPrevented) onPress?.(event);
      }}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 font-semibold outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[var(--stocksense-brand-border)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        isIconOnly ? "h-10 w-10 min-w-10 p-0" : sizeClasses[size] ?? sizeClasses.md,
        radiusClasses[radius] ?? radiusClasses.lg,
        variantClasses[resolvedVariant][resolvedColor],
        className
      )}
    >
      {isLoading ? <FaSpinner className="h-4 w-4 animate-spin" /> : startContent}
      {children}
      {!isLoading ? endContent : null}
    </Component>
  );
}

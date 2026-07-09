"use client";

import { Input } from "@heroui/react";
import { FaMinus, FaPlus } from "react-icons/fa";

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  const lowerBounded = Math.max(min, value);
  return typeof max === "number" ? Math.min(max, lowerBounded) : lowerBounded;
}

export default function QuantityStepperInput({
  label = "Quantity",
  value,
  onValueChange,
  min = 0,
  max,
  step = 1,
  isDisabled = false,
  variant = "bordered",
  radius = "lg",
  classNames,
  className = "",
  desktopClassName = "",
  mobileClassName = "",
}) {
  const safeMin = toInteger(min, 0);
  const safeMax =
    max === undefined || max === null ? undefined : toInteger(max, undefined);
  const safeStep = Math.max(1, toInteger(step, 1));
  const numericValue = clamp(toInteger(value, safeMin), safeMin, safeMax);
  const canDecrement = !isDisabled && numericValue > safeMin;
  const canIncrement =
    !isDisabled && (typeof safeMax !== "number" || numericValue < safeMax);

  const stepValue = (direction) => {
    const nextValue = clamp(
      numericValue + direction * safeStep,
      safeMin,
      safeMax
    );
    onValueChange?.(String(nextValue));
  };

  return (
    <div className={className}>
      <div className={`md:hidden ${mobileClassName}`}>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="grid min-h-14 grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]">
          <button
            type="button"
            aria-label={`Decrease ${label.toLowerCase()}`}
            onClick={() => stepValue(-1)}
            disabled={!canDecrement}
            className="grid h-full min-h-14 place-items-center border-r border-gray-200 text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)] disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
          >
            <FaMinus className="h-3.5 w-3.5" />
          </button>
          <input
            aria-label={label}
            type="number"
            inputMode="numeric"
            min={safeMin}
            max={safeMax}
            step={safeStep}
            value={value}
            onChange={(event) => onValueChange?.(event.target.value)}
            disabled={isDisabled}
            className="h-full min-h-14 w-full min-w-0 border-0 bg-white px-3 text-center text-lg font-semibold text-gray-950 outline-none disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="button"
            aria-label={`Increase ${label.toLowerCase()}`}
            onClick={() => stepValue(1)}
            disabled={!canIncrement}
            className="grid h-full min-h-14 place-items-center border-l border-gray-200 text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)] disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
          >
            <FaPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <Input
        label={label}
        value={value}
        onValueChange={onValueChange}
        type="number"
        min={safeMin}
        max={safeMax}
        step={safeStep}
        variant={variant}
        radius={radius}
        isDisabled={isDisabled}
        className={`max-md:hidden ${desktopClassName}`}
        classNames={classNames}
      />
    </div>
  );
}

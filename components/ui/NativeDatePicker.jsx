"use client";

import { cx } from "@/components/ui/classNames";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaCalendarAlt,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
} from "react-icons/fa";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_OPTIONS = MONTHS.map((month, index) => ({
  value: String(index),
  label: month.slice(0, 3),
}));

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const radiusClasses = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  full: "rounded-full",
};

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function toDateString(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate()
  )}`;
}

function createCalendarDate(value) {
  return {
    toString() {
      return value;
    },
  };
}

function parseDateString(value) {
  const dateString =
    typeof value === "string"
      ? value
      : typeof value?.toString === "function"
      ? value.toString()
      : "";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDisplayDate(date) {
  if (!date) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCalendarDays(displayDate) {
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = firstDay.getDay();
  const days = [];

  for (let index = 0; index < leadingDays; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function CalendarDropdown({
  ariaLabel,
  className = "",
  isOpen,
  onChange,
  onToggle,
  options,
  value,
}) {
  const selectedValue = String(value);
  const selectedOption =
    options.find((option) => String(option.value) === selectedValue) ?? options[0];

  return (
    <div className={cx("relative min-w-0", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        className="flex min-h-9 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm font-semibold text-gray-900 shadow-sm outline-none transition hover:border-[var(--stocksense-brand-border)] focus:border-[var(--stocksense-brand)] focus:ring-1 focus:ring-[var(--stocksense-brand-border)]"
      >
        <span className="min-w-0 truncate">{selectedOption?.label}</span>
        <FaChevronDown
          className={cx(
            "h-3 w-3 shrink-0 text-[var(--stocksense-brand)] transition",
            isOpen ? "rotate-180" : ""
          )}
        />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-[calc(100%+0.375rem)] z-[160] max-h-56 w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-1 text-sm shadow-xl"
        >
          {options.map((option) => {
            const optionValue = String(option.value);
            const selected = optionValue === selectedValue;

            return (
              <button
                key={optionValue}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onChange(optionValue)}
                className={cx(
                  "flex min-h-9 w-full min-w-0 items-center rounded-lg px-3 text-left font-semibold transition",
                  selected
                    ? "bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function NativeDatePicker({
  className = "",
  classNames = {},
  disabled = false,
  errorMessage,
  isDisabled = false,
  isInvalid = false,
  label,
  labelPlacement = "inside",
  onChange,
  placeholder = "mm/dd/yyyy",
  radius = "lg",
  showMonthAndYearPickers = false,
  value,
  variant = "bordered",
}) {
  const selectedDate = useMemo(() => parseDateString(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [openCalendarDropdown, setOpenCalendarDropdown] = useState(null);
  const [displayDate, setDisplayDate] = useState(() => selectedDate ?? new Date());
  const [popoverPosition, setPopoverPosition] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const resolvedDisabled = disabled || isDisabled;
  const showError = isInvalid && errorMessage;
  const selectedDateString = selectedDate ? toDateString(selectedDate) : "";

  useEffect(() => {
    if (selectedDate) setDisplayDate(selectedDate);
  }, [selectedDateString]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 12;
      const width = Math.min(320, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        Math.max(viewportPadding, window.innerWidth - width - viewportPadding)
      );
      const top = Math.min(
        rect.bottom + 8,
        Math.max(viewportPadding, window.innerHeight - 380)
      );

      setPopoverPosition({
        left,
        top,
        width,
      });
    };

    const closeOnOutsideClick = (event) => {
      const target = event.target;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpenCalendarDropdown(null);
      setIsOpen(false);
    };

    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      if (openCalendarDropdown) {
        setOpenCalendarDropdown(null);
        return;
      }
      setIsOpen(false);
    };

    updatePosition();
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, openCalendarDropdown]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const displayYear = displayDate.getFullYear();
    const firstYear = Math.min(currentYear - 5, displayYear - 2);
    const lastYear = Math.max(currentYear + 15, displayYear + 2);

    return Array.from(
      { length: lastYear - firstYear + 1 },
      (_, index) => {
        const year = String(firstYear + index);
        return { value: year, label: year };
      }
    );
  }, [displayDate]);

  const calendarDays = useMemo(() => getCalendarDays(displayDate), [displayDate]);
  const todayString = useMemo(() => toDateString(new Date()), []);

  const openCalendar = () => {
    if (resolvedDisabled) return;
    setDisplayDate(selectedDate ?? new Date());
    setOpenCalendarDropdown(null);
    setIsOpen((current) => !current);
  };

  const selectDate = (date) => {
    const nextValue = toDateString(date);
    onChange?.(createCalendarDate(nextValue));
    setOpenCalendarDropdown(null);
    setIsOpen(false);
  };

  const clearDate = (event) => {
    event.stopPropagation();
    onChange?.(null);
    setOpenCalendarDropdown(null);
    setIsOpen(false);
  };

  const moveMonth = (amount) => {
    setOpenCalendarDropdown(null);
    setDisplayDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1)
    );
  };

  const changeMonth = (month) => {
    setOpenCalendarDropdown(null);
    setDisplayDate((current) => new Date(current.getFullYear(), month, 1));
  };

  const changeYear = (year) => {
    setOpenCalendarDropdown(null);
    setDisplayDate((current) => new Date(year, current.getMonth(), 1));
  };

  const popover =
    isOpen && popoverPosition
      ? createPortal(
          <div
            ref={popoverRef}
            style={{
              left: `${popoverPosition.left}px`,
              top: `${popoverPosition.top}px`,
              width: `${popoverPosition.width}px`,
            }}
            className="fixed z-[140] rounded-2xl border border-[var(--stocksense-brand-border)] bg-white p-3 text-gray-900 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => moveMonth(-1)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
              >
                <FaChevronLeft className="h-3.5 w-3.5" />
              </button>

              {showMonthAndYearPickers ? (
                <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-2">
                  <CalendarDropdown
                    ariaLabel="Month"
                    isOpen={openCalendarDropdown === "month"}
                    value={displayDate.getMonth()}
                    onToggle={() =>
                      setOpenCalendarDropdown((current) =>
                        current === "month" ? null : "month"
                      )
                    }
                    onChange={(nextValue) => changeMonth(Number(nextValue))}
                    options={MONTH_OPTIONS}
                  />
                  <CalendarDropdown
                    ariaLabel="Year"
                    className="w-24"
                    isOpen={openCalendarDropdown === "year"}
                    value={displayDate.getFullYear()}
                    onToggle={() =>
                      setOpenCalendarDropdown((current) =>
                        current === "year" ? null : "year"
                      )
                    }
                    onChange={(nextValue) => changeYear(Number(nextValue))}
                    options={yearOptions}
                  />
                </div>
              ) : (
                <div className="min-w-0 flex-1 text-center text-sm font-semibold text-gray-950">
                  {MONTHS[displayDate.getMonth()]} {displayDate.getFullYear()}
                </div>
              )}

              <button
                type="button"
                aria-label="Next month"
                onClick={() => moveMonth(1)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
              >
                <FaChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-gray-500">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="py-1">
                  {weekday}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const dateString = date ? toDateString(date) : "";
                const isSelected = dateString && dateString === selectedDateString;
                const isToday = dateString === todayString;

                return date ? (
                  <button
                    key={dateString}
                    type="button"
                    aria-pressed={isSelected || undefined}
                    onClick={() => selectDate(date)}
                    className={cx(
                      "grid h-9 w-full place-items-center rounded-full text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--stocksense-brand-border)]",
                      isSelected
                        ? "bg-[var(--stocksense-brand)] text-white shadow-sm"
                        : "text-gray-700 hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]",
                      isToday && !isSelected
                        ? "border border-[var(--stocksense-brand-border)] text-[var(--stocksense-brand)]"
                        : ""
                    )}
                  >
                    {date.getDate()}
                  </button>
                ) : (
                  <div key={`empty-${index}`} className="h-9" />
                );
              })}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={cx("space-y-1", className)}>
      {label && labelPlacement !== "inside" ? (
        <span className={cx("block text-xs font-semibold text-gray-700", classNames.label)}>
          {label}
        </span>
      ) : null}

      <div
        ref={triggerRef}
        className={cx(
          "flex min-h-14 w-full items-center gap-2 border bg-white px-3 text-left shadow-sm transition hover:border-[var(--stocksense-brand-border)] focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
          variant === "bordered" ? "border-gray-200" : "border-transparent",
          radiusClasses[radius] ?? radiusClasses.lg,
          isInvalid ? "border-rose-500 bg-rose-50/40 focus-within:border-rose-500" : "",
          resolvedDisabled ? "bg-gray-50 text-gray-400" : "",
          classNames.inputWrapper
        )}
      >
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-invalid={isInvalid || undefined}
          disabled={resolvedDisabled}
          onClick={openCalendar}
          className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none disabled:cursor-not-allowed"
        >
          <span className="min-w-0 flex-1">
            {label && labelPlacement === "inside" ? (
              <span
                className={cx(
                  "block text-xs font-semibold leading-4 text-gray-700",
                  isOpen ? "text-[var(--stocksense-brand)]" : "",
                  classNames.label
                )}
              >
                {label}
              </span>
            ) : null}
            <span
              className={cx(
                "block truncate text-sm font-medium leading-5",
                selectedDate ? "text-gray-900" : "text-gray-400",
                classNames.input
              )}
            >
              {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
            </span>
          </span>
          <FaCalendarAlt className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" />
        </button>

        {selectedDate && !resolvedDisabled ? (
          <button
            type="button"
            aria-label="Clear date"
            onClick={clearDate}
            className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <FaTimes className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {showError ? (
        <p className="text-xs font-medium text-rose-600">{errorMessage}</p>
      ) : null}

      {popover}
    </div>
  );
}

export default NativeDatePicker;

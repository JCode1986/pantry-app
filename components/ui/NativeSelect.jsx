"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa";
import { cx } from "@/components/ui/classNames";
import useTransitionMount from "@/components/ui/useTransitionMount";

export default function NativeSelect({
  "aria-label": ariaLabel,
  className = "",
  disabled = false,
  hideLabel = false,
  label,
  onChange,
  onOpen,
  options,
  placeholder = "",
  triggerClassName = "",
  value,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const { isVisible, shouldRender } = useTransitionMount(isOpen);
  const hasLabel = Boolean(label);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      const target = event.target;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    const closeOnScroll = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const closeMenu = () => setIsOpen(false);

    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [isOpen]);

  const openMenu = () => {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const availableHeight = Math.max(160, window.innerHeight - rect.bottom - 18);
      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(288, availableHeight),
      });
    }
    if (!isOpen) onOpen?.();
    setIsOpen((current) => !current);
  };

  const menu =
    shouldRender && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              maxHeight: `${menuPosition.maxHeight}px`,
            }}
            className={cx(
              "fixed z-[180] origin-top overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 text-sm shadow-xl transition duration-200 ease-out motion-reduce:transition-none",
              isVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-2 scale-95 opacity-0"
            )}
          >
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setIsOpen(false);
                    onChange(option.value);
                  }}
                  className={`flex min-h-9 w-full items-center rounded-lg px-3 text-left font-semibold transition ${
                    selected
                      ? "bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative ${label ? "space-y-1" : ""} ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={openMenu}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMenu();
          }
        }}
        className={cx(
          "group flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm font-semibold text-gray-700 shadow-sm outline-none transition hover:border-[var(--stocksense-brand-border)] focus:border-[var(--stocksense-brand)] focus:ring-1 focus:ring-[var(--stocksense-brand-border)] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
          hasLabel ? "min-h-14 py-2" : "h-10",
          triggerClassName
        )}
      >
        <span className="min-w-0 flex-1">
          {hasLabel ? (
            <span
              className={cx(
                "block truncate text-[11px] font-semibold leading-4 text-gray-500 transition group-focus:text-[var(--stocksense-brand)]",
                hideLabel ? "sr-only" : ""
              )}
            >
              {label}
            </span>
          ) : null}
          <span className="block truncate text-sm leading-5 text-gray-900">
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <FaChevronDown
          className={`h-3 w-3 shrink-0 text-gray-400 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {menu}
    </div>
  );
}

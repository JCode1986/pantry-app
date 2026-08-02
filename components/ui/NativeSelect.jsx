"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa";

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
    isOpen && menuPosition
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
            className="fixed z-[120] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 text-sm shadow-xl"
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
      {label ? (
        <span
          className={`block text-xs font-semibold text-gray-500 ${
            hideLabel ? "sr-only" : ""
          }`}
        >
          {label}
        </span>
      ) : null}
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
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm font-semibold text-gray-700 shadow-sm outline-none transition hover:border-[var(--stocksense-brand-border)] focus:border-[var(--stocksense-brand)] focus:ring-1 focus:ring-[var(--stocksense-brand-border)] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${triggerClassName}`}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
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

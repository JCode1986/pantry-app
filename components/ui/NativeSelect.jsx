"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa";
import { cx } from "@/components/ui/classNames";
import useTransitionMount from "@/components/ui/useTransitionMount";

function getSelectMenuPosition(rect, optionCount) {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const margin = 12;
  const gap = 6;
  const menuWidth = Math.min(rect.width, Math.max(0, viewportWidth - margin * 2));
  const estimatedHeight = Math.min(Math.max(optionCount * 36 + 8, 44), 288);
  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - margin - gap);
  const spaceAbove = Math.max(0, rect.top - margin - gap);
  const placement =
    spaceBelow < estimatedHeight && spaceAbove > spaceBelow ? "top" : "bottom";
  const availableSpace = placement === "top" ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(44, Math.min(288, availableSpace));
  const top =
    placement === "top"
      ? Math.max(margin, rect.top - Math.min(estimatedHeight, maxHeight) - gap)
      : Math.min(
          rect.bottom + gap,
          Math.max(margin, viewportHeight - margin - maxHeight)
        );
  const left = Math.min(
    Math.max(margin, rect.left),
    Math.max(margin, viewportWidth - margin - menuWidth)
  );

  return {
    top,
    left,
    width: menuWidth,
    maxHeight,
    placement,
  };
}

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
      setMenuPosition(getSelectMenuPosition(rect, options.length));
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
              "fixed z-[180] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 text-sm shadow-xl transition duration-200 ease-out motion-reduce:transition-none",
              menuPosition.placement === "top" ? "origin-bottom" : "origin-top",
              isVisible
                ? "translate-y-0 scale-100 opacity-100"
                : cx(
                    "pointer-events-none scale-95 opacity-0",
                    menuPosition.placement === "top" ? "translate-y-2" : "-translate-y-2"
                  )
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
                  className={`flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-semibold transition duration-200 ease-out motion-reduce:transition-none ${
                    selected
                      ? "bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option.startContent ? (
                    <span className="shrink-0">{option.startContent}</span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate" title={option.label}>
                    {option.label}
                  </span>
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
          "group flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm font-semibold text-gray-700 shadow-sm outline-none transition duration-200 ease-out hover:border-[var(--stocksense-brand-border)] focus:border-[var(--stocksense-brand)] focus:ring-1 focus:ring-[var(--stocksense-brand-border)] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 motion-reduce:transition-none",
          hasLabel ? "min-h-14 py-2" : "h-10",
          triggerClassName
        )}
      >
        {selectedOption?.startContent ? (
          <span className="shrink-0">{selectedOption.startContent}</span>
        ) : null}
        <span className="min-w-0 flex-1">
          {hasLabel ? (
            <span
              className={cx(
                "block truncate text-[11px] font-semibold leading-4 text-gray-500 transition duration-200 ease-out group-focus:text-[var(--stocksense-brand)] motion-reduce:transition-none",
                hideLabel ? "sr-only" : ""
              )}
            >
              {label}
            </span>
          ) : null}
          <span className="block min-w-0 truncate text-sm leading-5 text-gray-900">
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <FaChevronDown
          className={`h-3 w-3 shrink-0 text-gray-400 transition duration-200 ease-out motion-reduce:transition-none ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {menu}
    </div>
  );
}

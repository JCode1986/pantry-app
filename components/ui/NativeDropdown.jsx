"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaEllipsisV } from "react-icons/fa";
import { cx } from "@/components/ui/classNames";
import useTransitionMount from "@/components/ui/useTransitionMount";

function getDropdownPosition(rect, itemCount) {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const margin = 12;
  const gap = 8;
  const estimatedHeight = Math.min(Math.max(itemCount * 36 + 8, 44), 288);
  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - margin - gap);
  const spaceAbove = Math.max(0, rect.top - margin - gap);
  const placement =
    spaceBelow < estimatedHeight && spaceAbove > spaceBelow ? "top" : "bottom";
  const maxHeight = Math.max(
    44,
    Math.min(288, placement === "top" ? spaceAbove : spaceBelow)
  );
  const top =
    placement === "top"
      ? Math.max(margin, rect.top - Math.min(estimatedHeight, maxHeight) - gap)
      : Math.min(
          rect.bottom + gap,
          Math.max(margin, viewportHeight - margin - maxHeight)
        );

  return {
    top,
    right: Math.max(margin, viewportWidth - rect.right),
    maxHeight,
    placement,
  };
}

export default function NativeDropdown({
  ariaLabel,
  buttonClassName = "h-9 w-9 min-w-9",
  className = "",
  disabled = false,
  items = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const { isVisible, shouldRender } = useTransitionMount(isOpen);
  const visibleItems = useMemo(() => items.filter(Boolean), [items]);

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

    const closeMenu = () => setIsOpen(false);

    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    if (disabled) return;

    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPosition(getDropdownPosition(rect, visibleItems.length));
    }
    setIsOpen((current) => !current);
  };

  const menu =
    shouldRender && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
              maxHeight: `${menuPosition.maxHeight}px`,
            }}
            className={cx(
              "fixed z-[180] min-w-48 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl transition duration-200 ease-out motion-reduce:transition-none",
              menuPosition.placement === "top" ? "origin-bottom-right" : "origin-top-right",
              isVisible
                ? "translate-y-0 scale-100 opacity-100"
                : cx(
                    "pointer-events-none scale-95 opacity-0",
                    menuPosition.placement === "top" ? "translate-y-2" : "-translate-y-2"
                  )
            )}
          >
            {visibleItems.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  item.onSelect();
                }}
                className={`block w-full px-3 py-2 text-left font-medium transition duration-200 ease-out hover:bg-gray-50 motion-reduce:transition-none ${
                  item.danger ? "text-rose-700" : "text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={toggleMenu}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleMenu();
          }
        }}
        className={`grid shrink-0 place-items-center rounded-xl text-gray-500 transition duration-200 ease-out hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${buttonClassName}`}
      >
        <FaEllipsisV className="h-4 w-4" />
      </button>
      {menu}
    </div>
  );
}

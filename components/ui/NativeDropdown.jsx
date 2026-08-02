"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaEllipsisV } from "react-icons/fa";

export default function NativeDropdown({
  ariaLabel,
  buttonClassName = "h-9 w-9 min-w-9",
  className = "",
  disabled = false,
  items,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

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
      setMenuPosition({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
    setIsOpen((current) => !current);
  };

  const menu =
    isOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
            className="fixed z-[120] min-w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl"
          >
            {items.filter(Boolean).map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  item.onSelect();
                }}
                className={`block w-full px-3 py-2 text-left font-medium transition hover:bg-gray-50 ${
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
        className={`grid shrink-0 place-items-center rounded-xl text-gray-500 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)] disabled:cursor-not-allowed disabled:opacity-50 ${buttonClassName}`}
      >
        <FaEllipsisV className="h-4 w-4" />
      </button>
      {menu}
    </div>
  );
}

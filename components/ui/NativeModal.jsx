"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { cx } from "@/components/ui/classNames";

const ModalContext = createContext(null);

function useModalContext(componentName) {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error(`${componentName} must be rendered inside Modal`);
  }
  return context;
}

export function Modal({
  children,
  classNames = {},
  hideCloseButton = false,
  isDismissable = true,
  isKeyboardDismissDisabled = false,
  isOpen = false,
  onOpenChange,
  placement = "center",
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = () => {
    onOpenChange?.(false);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isKeyboardDismissDisabled) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isDismissable) close();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDismissable, isKeyboardDismissDisabled, isOpen]);

  const contextValue = useMemo(
    () => ({
      baseClassName: classNames.base,
      close,
      hideCloseButton,
    }),
    [classNames.base, hideCloseButton, onOpenChange]
  );

  if (!mounted || !isOpen) return null;

  return createPortal(
    <ModalContext.Provider value={contextValue}>
      <div
        className={cx(
          "fixed inset-0 z-[140] flex overflow-y-auto bg-black/40 p-4",
          placement === "bottom"
            ? "items-end justify-center"
            : "items-center justify-center",
          classNames.wrapper
        )}
        onMouseDown={(event) => {
          if (!isDismissable || event.target !== event.currentTarget) return;
          close();
        }}
      >
        {children}
      </div>
    </ModalContext.Provider>,
    document.body
  );
}

export function ModalContent({ children, className = "", style, ...props }) {
  const { baseClassName, close, hideCloseButton } = useModalContext("ModalContent");
  const contentRef = useRef(null);

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  return (
    <section
      {...props}
      ref={contentRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      style={style}
      className={cx("relative max-w-md outline-none", baseClassName, className)}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {!hideCloseButton ? (
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="absolute right-3 top-3 z-30 grid h-8 w-8 place-items-center rounded-full text-gray-400 transition hover:bg-black/5 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]"
        >
          <FaTimes className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {typeof children === "function" ? children(close) : children}
    </section>
  );
}

export function ModalHeader({ children, className = "", ...props }) {
  return (
    <header {...props} className={cx("px-6 py-4 pr-12", className)}>
      {children}
    </header>
  );
}

export function ModalBody({ children, className = "", ...props }) {
  return (
    <div {...props} className={cx("px-6", className)}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className = "", ...props }) {
  return (
    <footer {...props} className={cx("px-6 py-4", className)}>
      {children}
    </footer>
  );
}

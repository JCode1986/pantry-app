"use client";

import {
  createContext,
  useCallback,
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
const MODAL_TRANSITION_MS = 220;

const sizeClasses = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  full: "max-w-full",
};

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
  size = "md",
}) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    setMounted(true);

    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const close = useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onOpenChange?.(false);
    }, MODAL_TRANSITION_MS);
  }, [onOpenChange]);

  useEffect(() => {
    if (!mounted) return undefined;

    if (isOpen) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setShouldRender(true);
      const animationFrame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => window.cancelAnimationFrame(animationFrame);
    }

    setIsVisible(false);
    const closeTimer = window.setTimeout(() => {
      setShouldRender(false);
    }, MODAL_TRANSITION_MS);

    return () => window.clearTimeout(closeTimer);
  }, [isOpen, mounted]);

  useEffect(() => {
    if (!shouldRender) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!isOpen || isKeyboardDismissDisabled) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isDismissable) close();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, isDismissable, isKeyboardDismissDisabled, isOpen]);

  const contextValue = useMemo(
    () => ({
      baseClassName: classNames.base,
      close,
      hideCloseButton,
      isVisible,
      placement,
      sizeClassName: sizeClasses[size] ?? sizeClasses.md,
    }),
    [classNames.base, close, hideCloseButton, isVisible, placement, size]
  );

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <ModalContext.Provider value={contextValue}>
      <div
        style={{
          backgroundColor: isVisible ? "rgb(0 0 0 / 0.4)" : "rgb(0 0 0 / 0)",
          transition: "background-color 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={cx(
          "wherekeep-native-modal-wrapper fixed inset-0 z-[140] flex overflow-y-auto px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,calc(env(safe-area-inset-top)+0.75rem))] motion-reduce:transition-none md:py-4",
          placement === "bottom"
            ? "items-end justify-center"
            : placement === "right"
              ? "items-stretch justify-end md:py-0"
            : "items-start justify-center md:items-center",
          isVisible ? "" : "pointer-events-none",
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
  const { baseClassName, close, hideCloseButton, isVisible, placement, sizeClassName } =
    useModalContext("ModalContent");
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
      style={{
        ...style,
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? "translateY(0) scale(1)"
          : placement === "bottom"
            ? "translateY(1rem) scale(1)"
            : placement === "right"
              ? "translateX(1rem) scale(1)"
              : "translateY(0.5rem) scale(0.94)",
        transition:
          "opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "opacity, transform",
      }}
      className={cx(
        "relative outline-none motion-reduce:transition-none",
        sizeClassName,
        baseClassName,
        className
      )}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {!hideCloseButton ? (
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="absolute right-3 top-3 z-30 hidden h-8 w-8 place-items-center rounded-full text-gray-400 transition hover:bg-black/5 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)] md:grid"
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
    <header
      {...props}
      className={cx("wherekeep-native-modal-header px-6 py-4 pr-12", className)}
    >
      {children}
    </header>
  );
}

export function ModalBody({ children, className = "", ...props }) {
  return (
    <div {...props} className={cx("px-6 pb-6", className)}>
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

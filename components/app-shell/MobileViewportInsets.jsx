"use client";

import { useEffect } from "react";

export default function MobileViewportInsets() {
  useEffect(() => {
    const root = document.documentElement;
    const visualViewport = window.visualViewport;
    let stableHeight = Math.max(window.innerHeight, visualViewport?.height ?? 0);
    let lastWidth = window.innerWidth;
    let frameId = 0;
    const pendingTimeouts = new Set();

    const setInsets = () => {
      const currentWidth = window.innerWidth;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const viewportOffsetTop = visualViewport?.offsetTop ?? 0;

      if (Math.abs(currentWidth - lastWidth) > 24) {
        stableHeight = 0;
        lastWidth = currentWidth;
      }

      stableHeight = Math.max(stableHeight, window.innerHeight, viewportHeight);

      const keyboardInset = Math.max(
        0,
        stableHeight - viewportHeight - viewportOffsetTop
      );
      const usableKeyboardInset = keyboardInset > 80 ? keyboardInset : 0;
      const sheetHeight =
        usableKeyboardInset > 0
          ? Math.max(320, stableHeight - usableKeyboardInset)
          : stableHeight;

      root.style.setProperty(
        "--wherekeep-mobile-sheet-height",
        `${Math.round(sheetHeight)}px`
      );
      root.style.setProperty(
        "--wherekeep-mobile-layout-height",
        `${Math.round(stableHeight)}px`
      );
      root.style.setProperty(
        "--wherekeep-keyboard-inset",
        `${Math.round(usableKeyboardInset)}px`
      );
      root.dataset.wherekeepKeyboard =
        usableKeyboardInset > 0 ? "open" : "closed";
    };

    const scheduleSetInsets = () => {
      if (frameId) window.cancelAnimationFrame(frameId);

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        setInsets();

        for (const delay of [90, 240]) {
          const timeoutId = window.setTimeout(() => {
            pendingTimeouts.delete(timeoutId);
            setInsets();
          }, delay);
          pendingTimeouts.add(timeoutId);
        }
      });
    };

    const resetStableHeight = () => {
      stableHeight = 0;
      scheduleSetInsets();
    };

    setInsets();
    window.addEventListener("resize", setInsets);
    window.addEventListener("orientationchange", resetStableHeight);
    window.addEventListener("focusin", scheduleSetInsets);
    window.addEventListener("focusout", scheduleSetInsets);
    visualViewport?.addEventListener("resize", setInsets);
    visualViewport?.addEventListener("scroll", setInsets);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      for (const timeoutId of pendingTimeouts) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener("resize", setInsets);
      window.removeEventListener("orientationchange", resetStableHeight);
      window.removeEventListener("focusin", scheduleSetInsets);
      window.removeEventListener("focusout", scheduleSetInsets);
      visualViewport?.removeEventListener("resize", setInsets);
      visualViewport?.removeEventListener("scroll", setInsets);
      root.style.removeProperty("--wherekeep-mobile-sheet-height");
      root.style.removeProperty("--wherekeep-mobile-layout-height");
      root.style.removeProperty("--wherekeep-keyboard-inset");
      delete root.dataset.wherekeepKeyboard;
    };
  }, []);

  return null;
}

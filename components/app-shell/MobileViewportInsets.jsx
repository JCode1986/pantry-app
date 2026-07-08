"use client";

import { useEffect } from "react";

export default function MobileViewportInsets() {
  useEffect(() => {
    const root = document.documentElement;
    const visualViewport = window.visualViewport;
    let stableHeight = Math.max(window.innerHeight, visualViewport?.height ?? 0);
    let lastWidth = window.innerWidth;

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

      root.style.setProperty(
        "--wherekeep-mobile-sheet-height",
        `${stableHeight}px`
      );
      root.style.setProperty(
        "--wherekeep-keyboard-inset",
        `${usableKeyboardInset}px`
      );
      root.dataset.wherekeepKeyboard =
        usableKeyboardInset > 0 ? "open" : "closed";
    };

    const resetStableHeight = () => {
      stableHeight = 0;
      window.requestAnimationFrame(setInsets);
    };

    setInsets();
    window.addEventListener("resize", setInsets);
    window.addEventListener("orientationchange", resetStableHeight);
    visualViewport?.addEventListener("resize", setInsets);
    visualViewport?.addEventListener("scroll", setInsets);

    return () => {
      window.removeEventListener("resize", setInsets);
      window.removeEventListener("orientationchange", resetStableHeight);
      visualViewport?.removeEventListener("resize", setInsets);
      visualViewport?.removeEventListener("scroll", setInsets);
      root.style.removeProperty("--wherekeep-mobile-sheet-height");
      root.style.removeProperty("--wherekeep-keyboard-inset");
      delete root.dataset.wherekeepKeyboard;
    };
  }, []);

  return null;
}

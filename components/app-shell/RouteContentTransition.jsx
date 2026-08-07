"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/classNames";

export default function RouteContentTransition({ children }) {
  const pathname = usePathname();
  const frameRefs = useRef([]);
  const [isEntering, setIsEntering] = useState(false);

  const clearTimers = useCallback(() => {
    frameRefs.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
    frameRefs.current = [];
  }, []);

  const playTransition = useCallback(() => {
    clearTimers();
    setIsEntering(false);

    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        frameRefs.current = frameRefs.current.filter(
          (frameId) => frameId !== firstFrame && frameId !== secondFrame
        );
        setIsEntering(true);
      });

      frameRefs.current.push(secondFrame);
    });

    frameRefs.current.push(firstFrame);
  }, [clearTimers]);

  useEffect(() => {
    playTransition();
    return clearTimers;
  }, [clearTimers, pathname, playTransition]);

  return (
    <div
      className={cx(
        "wherekeep-route-content",
        isEntering ? "wherekeep-route-content--enter" : ""
      )}
    >
      {children}
    </div>
  );
}

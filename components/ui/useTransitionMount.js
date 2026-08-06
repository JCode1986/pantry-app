"use client";

import { useEffect, useRef, useState } from "react";

export default function useTransitionMount(isMounted, duration = 220) {
  const [shouldRender, setShouldRender] = useState(isMounted);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isMounted) {
      setShouldRender(true);
      const animationFrame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => window.cancelAnimationFrame(animationFrame);
    }

    setIsVisible(false);
    timerRef.current = window.setTimeout(() => {
      setShouldRender(false);
      timerRef.current = null;
    }, duration);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [duration, isMounted]);

  return { isVisible, shouldRender };
}

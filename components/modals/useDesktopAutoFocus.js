"use client";

import { useEffect, useState } from "react";

export default function useDesktopAutoFocus(isEnabled = true) {
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);

  useEffect(() => {
    if (!isEnabled || typeof window === "undefined") {
      setShouldAutoFocus(false);
      return;
    }

    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setShouldAutoFocus(query.matches);

    sync();
    query.addEventListener?.("change", sync);

    return () => {
      query.removeEventListener?.("change", sync);
    };
  }, [isEnabled]);

  return shouldAutoFocus;
}

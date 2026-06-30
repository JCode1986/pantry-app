"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getUserPreferencesAction } from "@/app/actions/preferences";
import {
  applyAppPreferences,
  readStoredPreferences,
  saveStoredPreferences,
} from "@/utils/appPreferences";

export default function AppPreferences() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    applyAppPreferences(readStoredPreferences());

    const syncPreferences = async () => {
      const result = await getUserPreferencesAction();
      if (cancelled || result?.error || !result?.data) return;

      saveStoredPreferences(result.data);
    };

    syncPreferences();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}

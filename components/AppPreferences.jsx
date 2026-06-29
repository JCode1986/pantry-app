"use client";

import { useEffect } from "react";
import { getUserPreferencesAction } from "@/app/actions/preferences";
import {
  applyAppPreferences,
  readStoredPreferences,
  saveStoredPreferences,
} from "@/utils/appPreferences";

export default function AppPreferences() {
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
  }, []);

  return null;
}

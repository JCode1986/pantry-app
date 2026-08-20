"use client";

import { useEffect } from "react";
import { saveStoredPreferences } from "@/utils/appPreferences";

export default function AppPreferences({ initialPreferences }) {
  useEffect(() => {
    saveStoredPreferences(initialPreferences);
  }, [initialPreferences]);

  return null;
}

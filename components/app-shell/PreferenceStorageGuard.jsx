"use client";

import { useEffect } from "react";
import { clearStoredPreferences } from "@/utils/appPreferences";

const AUTH_MARKER_COOKIE = "wherekeep_auth_state";

function hasAuthMarker() {
  if (typeof document === "undefined") return false;

  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${AUTH_MARKER_COOKIE}=1`);
}

export default function PreferenceStorageGuard() {
  useEffect(() => {
    if (!hasAuthMarker()) clearStoredPreferences();
  }, []);

  return null;
}

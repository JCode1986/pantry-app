import {
  DEFAULT_PREFERENCES,
  applyAppPreferences,
} from "@/utils/appPreferences";

export function clearBrowserLogoutStorage() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.clear();
  } catch {
    // Storage can fail in private browsing or locked-down contexts.
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // Session storage cleanup is best-effort.
  }

  applyAppPreferences(DEFAULT_PREFERENCES);
}

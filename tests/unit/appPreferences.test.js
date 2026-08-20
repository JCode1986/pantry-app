import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_STORAGE_KEY,
  applyAppPreferences,
  clearStoredPreferences,
  getPreferenceApplyScript,
  getFontById,
  getPreferenceBootScript,
  getThemeById,
  normalizePreferences,
  readStoredPreferences,
  saveStoredPreferences,
} from "@/utils/appPreferences";

describe("app preference helpers", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-stocksense-theme");
    document.documentElement.removeAttribute("data-stocksense-font");
    document.documentElement.removeAttribute("style");
  });

  it("normalizes unknown preferences to defaults", () => {
    expect(normalizePreferences({ themeId: "ocean", fontId: "serif" })).toEqual({
      themeId: "ocean",
      fontId: "serif",
    });
    expect(normalizePreferences({ themeId: "missing", fontId: "missing" })).toEqual(
      DEFAULT_PREFERENCES
    );
    expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });

  it("returns default theme and font records for unknown ids", () => {
    expect(getThemeById("ocean").id).toBe("ocean");
    expect(getThemeById("missing").id).toBe(DEFAULT_PREFERENCES.themeId);
    expect(getFontById("mono").id).toBe("mono");
    expect(getFontById("missing").id).toBe(DEFAULT_PREFERENCES.fontId);
  });

  it("applies normalized preferences to the document root", () => {
    applyAppPreferences({ themeId: "forest", fontId: "mono" });

    expect(document.documentElement.dataset.stocksenseTheme).toBe("forest");
    expect(document.documentElement.dataset.stocksenseFont).toBe("mono");
    expect(document.documentElement.style.getPropertyValue("--stocksense-brand")).toBe(
      "#15803D"
    );
    expect(document.documentElement.style.getPropertyValue("--stocksense-font-family")).toContain(
      "monospace"
    );
  });

  it("reads, saves, and repairs localStorage preferences", () => {
    expect(readStoredPreferences()).toEqual(DEFAULT_PREFERENCES);

    const saved = saveStoredPreferences({ themeId: "sunset", fontId: "system" });
    expect(saved).toEqual({ themeId: "sunset", fontId: "system" });
    expect(JSON.parse(window.localStorage.getItem(PREFERENCE_STORAGE_KEY))).toEqual(saved);
    expect(readStoredPreferences()).toEqual(saved);

    window.localStorage.setItem(PREFERENCE_STORAGE_KEY, "{bad json");
    expect(readStoredPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it("clears stored preferences and reapplies defaults", () => {
    saveStoredPreferences({ themeId: "forest", fontId: "mono" });

    clearStoredPreferences();

    expect(window.localStorage.getItem(PREFERENCE_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.dataset.stocksenseTheme).toBe(
      DEFAULT_PREFERENCES.themeId
    );
    expect(document.documentElement.dataset.stocksenseFont).toBe(
      DEFAULT_PREFERENCES.fontId
    );
  });

  it("generates a safe boot script containing preference constants", () => {
    const script = getPreferenceBootScript();

    expect(script).toContain(PREFERENCE_STORAGE_KEY);
    expect(script).toContain(DEFAULT_PREFERENCES.themeId);
    expect(script).not.toContain("</script>");
  });

  it("generates a safe apply script for server-resolved preferences", () => {
    const script = getPreferenceApplyScript(
      { themeId: "forest", fontId: "mono" },
      { persist: true }
    );

    expect(script).toContain(PREFERENCE_STORAGE_KEY);
    expect(script).toContain('"themeId":"forest"');
    expect(script).toContain("localStorage.setItem");
    expect(script).not.toContain("</script>");
  });
});

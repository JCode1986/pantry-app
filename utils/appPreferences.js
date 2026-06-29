export const PREFERENCE_STORAGE_KEY = "stocksense.preferences";

export const THEME_OPTIONS = [
  {
    id: "stocksense",
    label: "StockSense",
    description: "Teal, sky, and lime",
    swatch: "#0E7488",
    soft: "#E6FAF6",
    border: "#9FE7D7",
    variables: {
      "--color-stocksense-teal": "oklch(0.55 0.07 184.12)",
      "--color-stocksense-tealDark": "oklch(0.41 0.06 184.09)",
      "--color-stocksense-sky": "oklch(0.74 0.07 207.05)",
      "--color-stocksense-lime": "oklch(0.86 0.19 113.22)",
      "--stocksense-brand": "#0E7488",
      "--stocksense-brand-dark": "#0A5664",
      "--stocksense-brand-soft": "#E6FAF6",
      "--stocksense-brand-border": "#9FE7D7",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Blue and aqua",
    swatch: "#2563EB",
    soft: "#EFF6FF",
    border: "#BFDBFE",
    variables: {
      "--color-stocksense-teal": "oklch(0.54 0.18 258)",
      "--color-stocksense-tealDark": "oklch(0.38 0.15 260)",
      "--color-stocksense-sky": "oklch(0.78 0.1 225)",
      "--color-stocksense-lime": "oklch(0.83 0.13 190)",
      "--stocksense-brand": "#2563EB",
      "--stocksense-brand-dark": "#1D4ED8",
      "--stocksense-brand-soft": "#EFF6FF",
      "--stocksense-brand-border": "#BFDBFE",
    },
  },
  {
    id: "forest",
    label: "Forest",
    description: "Green and moss",
    swatch: "#15803D",
    soft: "#F0FDF4",
    border: "#BBF7D0",
    variables: {
      "--color-stocksense-teal": "oklch(0.49 0.13 145)",
      "--color-stocksense-tealDark": "oklch(0.33 0.1 145)",
      "--color-stocksense-sky": "oklch(0.74 0.09 165)",
      "--color-stocksense-lime": "oklch(0.84 0.16 125)",
      "--stocksense-brand": "#15803D",
      "--stocksense-brand-dark": "#166534",
      "--stocksense-brand-soft": "#F0FDF4",
      "--stocksense-brand-border": "#BBF7D0",
    },
  },
  {
    id: "plum",
    label: "Plum",
    description: "Violet and rose",
    swatch: "#7C3AED",
    soft: "#F5F3FF",
    border: "#DDD6FE",
    variables: {
      "--color-stocksense-teal": "oklch(0.55 0.18 300)",
      "--color-stocksense-tealDark": "oklch(0.39 0.16 300)",
      "--color-stocksense-sky": "oklch(0.78 0.1 318)",
      "--color-stocksense-lime": "oklch(0.84 0.11 350)",
      "--stocksense-brand": "#7C3AED",
      "--stocksense-brand-dark": "#6D28D9",
      "--stocksense-brand-soft": "#F5F3FF",
      "--stocksense-brand-border": "#DDD6FE",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Amber and coral",
    swatch: "#D97706",
    soft: "#FFFBEB",
    border: "#FDE68A",
    variables: {
      "--color-stocksense-teal": "oklch(0.62 0.15 55)",
      "--color-stocksense-tealDark": "oklch(0.43 0.13 45)",
      "--color-stocksense-sky": "oklch(0.78 0.12 35)",
      "--color-stocksense-lime": "oklch(0.88 0.14 85)",
      "--stocksense-brand": "#D97706",
      "--stocksense-brand-dark": "#B45309",
      "--stocksense-brand-soft": "#FFFBEB",
      "--stocksense-brand-border": "#FDE68A",
    },
  },
  {
    id: "blush",
    label: "Blush",
    description: "Pink and berry",
    swatch: "#DB2777",
    soft: "#FDF2F8",
    border: "#FBCFE8",
    variables: {
      "--color-stocksense-teal": "oklch(0.58 0.2 355)",
      "--color-stocksense-tealDark": "oklch(0.42 0.18 355)",
      "--color-stocksense-sky": "oklch(0.78 0.12 330)",
      "--color-stocksense-lime": "oklch(0.88 0.12 20)",
      "--stocksense-brand": "#DB2777",
      "--stocksense-brand-dark": "#BE185D",
      "--stocksense-brand-soft": "#FDF2F8",
      "--stocksense-brand-border": "#FBCFE8",
    },
  },
  {
    id: "lilac",
    label: "Lilac",
    description: "Lavender and pink",
    swatch: "#9333EA",
    soft: "#FAF5FF",
    border: "#E9D5FF",
    variables: {
      "--color-stocksense-teal": "oklch(0.55 0.21 305)",
      "--color-stocksense-tealDark": "oklch(0.39 0.18 305)",
      "--color-stocksense-sky": "oklch(0.78 0.11 285)",
      "--color-stocksense-lime": "oklch(0.86 0.11 335)",
      "--stocksense-brand": "#9333EA",
      "--stocksense-brand-dark": "#7E22CE",
      "--stocksense-brand-soft": "#FAF5FF",
      "--stocksense-brand-border": "#E9D5FF",
    },
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Steel and slate",
    swatch: "#475569",
    soft: "#F8FAFC",
    border: "#CBD5E1",
    variables: {
      "--color-stocksense-teal": "oklch(0.45 0.04 255)",
      "--color-stocksense-tealDark": "oklch(0.32 0.04 255)",
      "--color-stocksense-sky": "oklch(0.72 0.05 240)",
      "--color-stocksense-lime": "oklch(0.78 0.07 180)",
      "--stocksense-brand": "#475569",
      "--stocksense-brand-dark": "#334155",
      "--stocksense-brand-soft": "#F8FAFC",
      "--stocksense-brand-border": "#CBD5E1",
    },
  },
];

export const FONT_OPTIONS = [
  {
    id: "default",
    label: "Default",
    description: "Clean app standard",
    family: "Arial, Helvetica, sans-serif",
  },
  {
    id: "system",
    label: "System",
    description: "Native device font",
    family:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: "rounded",
    label: "Rounded",
    description: "Softer interface feel",
    family: '"Trebuchet MS", Arial, Helvetica, sans-serif',
  },
  {
    id: "serif",
    label: "Serif",
    description: "More editorial",
    family: 'Georgia, "Times New Roman", serif',
  },
  {
    id: "mono",
    label: "Mono",
    description: "Technical and compact",
    family: 'var(--font-geist-mono), "SFMono-Regular", Consolas, monospace',
  },
  {
    id: "chic",
    label: "Chic",
    description: "Elegant serif",
    family: '"Palatino Linotype", Palatino, Georgia, serif',
  },
  {
    id: "casual",
    label: "Casual",
    description: "Light handwritten feel",
    family: '"Segoe Print", "Bradley Hand ITC", "Comic Sans MS", cursive',
  },
  {
    id: "structured",
    label: "Structured",
    description: "Firm and practical",
    family: 'Tahoma, Verdana, "Segoe UI", sans-serif',
  },
];

export const DEFAULT_PREFERENCES = {
  themeId: "stocksense",
  fontId: "default",
};

export function normalizePreferences(preferences = {}) {
  const themeId = THEME_OPTIONS.some((theme) => theme.id === preferences.themeId)
    ? preferences.themeId
    : DEFAULT_PREFERENCES.themeId;
  const fontId = FONT_OPTIONS.some((font) => font.id === preferences.fontId)
    ? preferences.fontId
    : DEFAULT_PREFERENCES.fontId;

  return { themeId, fontId };
}

export function getThemeById(themeId) {
  return (
    THEME_OPTIONS.find((theme) => theme.id === themeId) ||
    THEME_OPTIONS.find((theme) => theme.id === DEFAULT_PREFERENCES.themeId)
  );
}

export function getFontById(fontId) {
  return (
    FONT_OPTIONS.find((font) => font.id === fontId) ||
    FONT_OPTIONS.find((font) => font.id === DEFAULT_PREFERENCES.fontId)
  );
}

export function applyAppPreferences(preferences) {
  if (typeof document === "undefined") return;

  const normalized = normalizePreferences(preferences);
  const theme = getThemeById(normalized.themeId);
  const font = getFontById(normalized.fontId);
  const root = document.documentElement;

  Object.entries(theme.variables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });

  root.style.setProperty("--stocksense-font-family", font.family);
  root.dataset.stocksenseTheme = theme.id;
  root.dataset.stocksenseFont = font.id;
}

export function readStoredPreferences() {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);
    return normalizePreferences(raw ? JSON.parse(raw) : DEFAULT_PREFERENCES);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveStoredPreferences(preferences) {
  const normalized = normalizePreferences(preferences);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(normalized));
  }

  applyAppPreferences(normalized);
  return normalized;
}

export function getPreferenceBootScript() {
  const bootThemes = THEME_OPTIONS.map(({ id, variables }) => ({
    id,
    variables,
  }));
  const bootFonts = FONT_OPTIONS.map(({ id, family }) => ({
    id,
    family,
  }));

  return `
(function () {
  try {
    var key = ${JSON.stringify(PREFERENCE_STORAGE_KEY)};
    var defaultPreferences = ${JSON.stringify(DEFAULT_PREFERENCES)};
    var themes = ${JSON.stringify(bootThemes)};
    var fonts = ${JSON.stringify(bootFonts)};
    var raw = window.localStorage.getItem(key);
    var stored = raw ? JSON.parse(raw) : defaultPreferences;
    var theme = themes.find(function (item) { return item.id === stored.themeId; }) || themes[0];
    var font = fonts.find(function (item) { return item.id === stored.fontId; }) || fonts[0];
    var root = document.documentElement;

    Object.keys(theme.variables).forEach(function (name) {
      root.style.setProperty(name, theme.variables[name]);
    });

    root.style.setProperty("--stocksense-font-family", font.family);
    root.dataset.stocksenseTheme = theme.id;
    root.dataset.stocksenseFont = font.id;
  } catch (error) {}
})();
  `.trim();
}

const DEFAULT_APP_URL =
  process.env.NODE_ENV === "production"
    ? "https://www.wherekeep.com"
    : "http://localhost:3000";

const KNOWN_APP_ORIGINS = new Set([
  "https://www.wherekeep.com",
  "https://wherekeep.com",
]);

export function getCanonicalAppUrl() {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.origin;
    }
  } catch {
    // Fall through to the known-safe default.
  }

  return DEFAULT_APP_URL;
}

export function isAllowedOrigin(origin) {
  if (!origin) return true;

  try {
    const requestOrigin = new URL(origin).origin;
    return (
      requestOrigin === getCanonicalAppUrl() ||
      KNOWN_APP_ORIGINS.has(requestOrigin)
    );
  } catch {
    return false;
  }
}

export function safeInternalPath(value, fallback = "/") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  ) {
    return fallback;
  }

  return trimmed || fallback;
}

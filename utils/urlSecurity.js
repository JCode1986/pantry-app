const PRODUCTION_APP_URL = "https://www.wherekeep.com";
const LOCAL_APP_URL = "http://localhost:3000";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const DEFAULT_APP_URL =
  process.env.NODE_ENV === "production" ? PRODUCTION_APP_URL : LOCAL_APP_URL;

const KNOWN_APP_ORIGINS = new Set([
  "https://www.wherekeep.com",
  "https://wherekeep.com",
]);

export function getCanonicalAppUrl() {
  const previewUrl =
    process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null;
  const candidate = process.env.NEXT_PUBLIC_APP_URL || previewUrl || DEFAULT_APP_URL;

  try {
    const url = new URL(candidate);
    if (url.hostname === "wherekeep.com" || url.hostname === "www.wherekeep.com") {
      return PRODUCTION_APP_URL;
    }

    if (
      process.env.NODE_ENV === "production" &&
      process.env.VERCEL_ENV !== "preview" &&
      LOCAL_HOSTNAMES.has(url.hostname)
    ) {
      return PRODUCTION_APP_URL;
    }

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

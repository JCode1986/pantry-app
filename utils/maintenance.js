export const MAINTENANCE_PATH = "/maintenance";
export const SERVICE_UNAVAILABLE_CODE = "service-unavailable";
export const SERVICE_UNAVAILABLE_MESSAGE =
  "WhereKeep account access is temporarily unavailable while maintenance is in progress.";

const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

export function isMaintenanceModeEnabled(value) {
  return TRUTHY_VALUES.has(String(value || "").trim().toLowerCase());
}

export function getSafeInternalPath(value, fallback = "/") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}

export function isServiceUnavailableError(error) {
  const status = Number(error?.status ?? error?.statusCode ?? 0);
  if (status >= 500) return true;

  const message = String(
    error?.message || error?.name || error?.code || error || ""
  ).toLowerCase();

  return [
    "fetch failed",
    "failed to fetch",
    "networkerror",
    "network request failed",
    "econnrefused",
    "econnreset",
    "enotfound",
    "etimedout",
    "timeout",
    "service unavailable",
    "temporarily unavailable",
    "upgrading",
    "maintenance",
  ].some((pattern) => message.includes(pattern));
}

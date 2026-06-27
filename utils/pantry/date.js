const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function parsePantryDate(value) {
  if (!value) return null;

  const date =
    typeof value === "string" ? new Date(`${value}T00:00:00`) : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysUntil(value, today = new Date()) {
  const date = parsePantryDate(value);
  if (!date) return Infinity;

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  return Math.floor((date.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

export function isExpiringSoon(value, withinDays) {
  const normalizedDays = toPositiveInteger(withinDays, 7);
  return daysUntil(value) <= normalizedDays;
}

export function toNonNegativeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function toPositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

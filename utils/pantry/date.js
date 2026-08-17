const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function addDays(date, days) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

export function parsePantryDate(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const datePart = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    const date = datePart
      ? new Date(`${datePart}T00:00:00`)
      : new Date(trimmed);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysUntil(value, today = new Date()) {
  const date = parsePantryDate(value);
  if (!date) return Infinity;

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  return Math.floor((date.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

export function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isExpiringSoon(value, withinDays) {
  const normalizedDays = toPositiveInteger(withinDays, 7);
  const days = daysUntil(value);
  return days >= 0 && days <= normalizedDays;
}

export function toNonNegativeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function toPositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

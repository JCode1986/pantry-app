export function normalizeName(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeSearchTerm(value) {
  return normalizeName(value).replace(/[%,_()]/g, "").slice(0, 80);
}

export function normalizeBarcode(value) {
  return typeof value === "string"
    ? value.trim().replace(/[^0-9A-Za-z._-]/g, "").slice(0, 80)
    : "";
}

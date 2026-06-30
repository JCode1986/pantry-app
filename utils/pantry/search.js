export function containsQuery(value, query) {
  return String(value ?? "").toLowerCase().includes(query);
}

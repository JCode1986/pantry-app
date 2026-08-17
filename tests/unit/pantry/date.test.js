import { describe, expect, it } from "vitest";
import {
  addDays,
  daysUntil,
  isExpiringSoon,
  parsePantryDate,
  toDateString,
  toNonNegativeInteger,
  toPositiveInteger,
} from "@/utils/pantry/date";

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("pantry date utilities", () => {
  it("parses ISO date-only strings as valid pantry dates", () => {
    const date = parsePantryDate("2026-08-06");

    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(6);
  });

  it("returns null for empty and malformed dates", () => {
    expect(parsePantryDate("")).toBeNull();
    expect(parsePantryDate(null)).toBeNull();
    expect(parsePantryDate("not a date")).toBeNull();
  });

  it("calculates whole days from the start of the provided day", () => {
    const today = new Date("2026-08-06T15:30:00");

    expect(daysUntil("2026-08-06", today)).toBe(0);
    expect(daysUntil("2026-08-07", today)).toBe(1);
    expect(daysUntil("2026-08-05", today)).toBe(-1);
  });

  it("adds days from the start of the provided day", () => {
    const result = addDays(new Date("2026-08-06T15:30:00"), 3);

    expect(toDateString(result)).toBe("2026-08-09");
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it("formats local dates as yyyy-mm-dd strings", () => {
    expect(toDateString(new Date("2026-08-06T15:30:00"))).toBe("2026-08-06");
  });

  it("treats invalid expiration dates as infinitely far away", () => {
    expect(daysUntil("bad input", new Date("2026-08-06T00:00:00"))).toBe(Infinity);
  });

  it("detects upcoming expirations inside an inclusive window", () => {
    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + 3);

    expect(isExpiringSoon(formatDateOnly(upcoming), 7)).toBe(true);
    expect(isExpiringSoon("2020-01-01", 7)).toBe(false);
  });

  it("normalizes integer values with safe fallbacks", () => {
    expect(toNonNegativeInteger("4", 0)).toBe(4);
    expect(toNonNegativeInteger("0", 2)).toBe(0);
    expect(toNonNegativeInteger("-1", 2)).toBe(2);
    expect(toNonNegativeInteger("abc", 3)).toBe(3);

    expect(toPositiveInteger("5", 1)).toBe(5);
    expect(toPositiveInteger("0", 8)).toBe(8);
    expect(toPositiveInteger("-4", 8)).toBe(8);
    expect(toPositiveInteger(undefined, 9)).toBe(9);
  });
});

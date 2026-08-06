import { describe, expect, it } from "vitest";
import {
  normalizeBarcode,
  normalizeName,
  normalizeSearchTerm,
} from "@/utils/pantry/validation";

describe("pantry validation helpers", () => {
  it("trims names without coercing non-string values", () => {
    expect(normalizeName("  Black Beans  ")).toBe("Black Beans");
    expect(normalizeName("")).toBe("");
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(123)).toBe("");
  });

  it("normalizes search terms by stripping query-control characters and bounding length", () => {
    expect(normalizeSearchTerm(" %(beans)_ ")).toBe("beans");
    expect(normalizeSearchTerm("a".repeat(100))).toHaveLength(80);
  });

  it("keeps barcode-safe characters and removes unsafe characters", () => {
    expect(normalizeBarcode("  123 45-AB_cd.ef!@#  ")).toBe("12345-AB_cd.ef");
    expect(normalizeBarcode(null)).toBe("");
    expect(normalizeBarcode("x".repeat(100))).toHaveLength(80);
  });
});

import { describe, expect, it } from "vitest";
import { containsQuery } from "@/utils/pantry/search";

describe("pantry search utilities", () => {
  it("matches normalized lowercase queries inside arbitrary values", () => {
    expect(containsQuery("Black Beans", "black")).toBe(true);
    expect(containsQuery("Black Beans", "beans")).toBe(true);
  });

  it("handles nullish values without throwing", () => {
    expect(containsQuery(null, "beans")).toBe(false);
    expect(containsQuery(undefined, "")).toBe(true);
  });

  it("does not match missing text", () => {
    expect(containsQuery("Rice", "beans")).toBe(false);
  });
});

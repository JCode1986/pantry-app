import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCanonicalAppUrl,
  isAllowedOrigin,
  safeInternalPath,
} from "@/utils/urlSecurity";

describe("URL security helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a valid configured app origin without path leakage", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.test/profile");

    expect(getCanonicalAppUrl()).toBe("https://app.example.test");
  });

  it("falls back when the configured app URL is invalid", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "javascript:alert(1)");

    expect(getCanonicalAppUrl()).toBe("http://localhost:3000");
  });

  it("allows the configured origin and known production origins", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.test");

    expect(isAllowedOrigin("https://app.example.test/settings")).toBe(true);
    expect(isAllowedOrigin("https://wherekeep.com")).toBe(true);
    expect(isAllowedOrigin("https://evil.example.test")).toBe(false);
  });

  it("sanitizes redirect paths to prevent open redirects", () => {
    expect(safeInternalPath("/dashboard?tab=items")).toBe("/dashboard?tab=items");
    expect(safeInternalPath("https://evil.example.test", "/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("//evil.example.test", "/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/\\evil", "/dashboard")).toBe("/dashboard");
    expect(safeInternalPath(null, "/dashboard")).toBe("/dashboard");
  });
});

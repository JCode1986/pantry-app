import { describe, expect, it } from "vitest";
import { assertSafeTestEnvironment } from "@/tests/helpers/environment";

describe("test environment safety", () => {
  it("accepts local test services and Stripe test keys", () => {
    expect(
      assertSafeTestEnvironment({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        STRIPE_SECRET_KEY: "sk_test_123",
      })
    ).toBe(true);
  });

  it("rejects production app URLs and live Stripe keys", () => {
    expect(() =>
      assertSafeTestEnvironment({
        NEXT_PUBLIC_APP_URL: "https://www.wherekeep.com",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        STRIPE_SECRET_KEY: "sk_test_123",
      })
    ).toThrow(/production WhereKeep URL/);

    expect(() =>
      assertSafeTestEnvironment({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        STRIPE_SECRET_KEY: "sk_live_123",
      })
    ).toThrow(/live Stripe/);
  });
});

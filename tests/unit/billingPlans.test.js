import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BILLING_INTERVALS,
  getBillingPlan,
  getEffectiveBillingPlan,
  getEffectivePlanId,
  getEffectivePlanLimits,
  getStripePriceId,
} from "@/utils/billingPlans";

describe("billing plan helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to the free plan for unknown plan ids", () => {
    expect(getBillingPlan("missing").id).toBe("free");
  });

  it("returns paid plan ids only for active billing statuses", () => {
    expect(getEffectivePlanId({ plan_id: "plus", status: "active" })).toBe("plus");
    expect(getEffectivePlanId({ planId: "family", status: "trialing" })).toBe("family");
    expect(getEffectivePlanId({ plan_id: "plus", status: "past_due" })).toBe("free");
    expect(getEffectivePlanId({ plan_id: "family", status: "canceled" })).toBe("free");
    expect(getEffectivePlanId(null)).toBe("free");
  });

  it("resolves effective plans and limits from billing rows", () => {
    expect(getEffectiveBillingPlan({ plan_id: "family", status: "active" }).id).toBe("family");
    expect(getEffectivePlanLimits({ plan_id: "free", status: "free" })).toEqual({
      users: 1,
      locations: 1,
      items: 50,
    });
    expect(getEffectivePlanLimits({ plan_id: "plus", status: "active" }).items).toBeNull();
  });

  it("reads Stripe price ids from the configured environment variable", () => {
    vi.stubEnv("STRIPE_PLUS_MONTHLY_PRICE_ID", "price_plus_monthly_test_override");
    vi.stubEnv("STRIPE_FAMILY_YEARLY_PRICE_ID", "price_family_yearly_test_override");

    expect(getStripePriceId("plus", BILLING_INTERVALS.monthly)).toBe(
      "price_plus_monthly_test_override"
    );
    expect(getStripePriceId("family", BILLING_INTERVALS.yearly)).toBe(
      "price_family_yearly_test_override"
    );
    expect(getStripePriceId("free", BILLING_INTERVALS.monthly)).toBeNull();
  });
});

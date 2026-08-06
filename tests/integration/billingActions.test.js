import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStripeMock } from "@/tests/mocks/stripe";
import { createTestUser } from "@/tests/helpers/factories";

const billingMocks = vi.hoisted(() => ({
  getVerifiedSession: vi.fn(),
  createClient: vi.fn(),
  getStripe: vi.fn(),
  stripe: null,
  supabase: null,
}));

vi.mock("@/lib/verifiedSession", () => ({
  getVerifiedSession: billingMocks.getVerifiedSession,
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: billingMocks.createClient,
}));

vi.mock("@/utils/stripe", () => ({
  getStripe: billingMocks.getStripe,
}));

const {
  createBillingPortalSessionAction,
  createCheckoutSessionAction,
  getUserBillingAction,
} = await import("@/app/actions/billing");

function createBillingSupabase(response) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => response),
  };

  return {
    from: vi.fn(() => query),
    query,
  };
}

describe("billing server actions", () => {
  beforeEach(() => {
    billingMocks.getVerifiedSession.mockResolvedValue({
      user: createTestUser(),
      error: null,
    });
    billingMocks.supabase = createBillingSupabase({
      data: {
        plan_id: "plus",
        status: "active",
        stripe_price_id: "price_plus_monthly_test",
        stripe_customer_id: "cus_test",
        current_period_end: "2026-12-31T00:00:00.000Z",
        cancel_at_period_end: false,
      },
      error: null,
    });
    billingMocks.createClient.mockResolvedValue(billingMocks.supabase);
    billingMocks.stripe = createStripeMock();
    billingMocks.getStripe.mockReturnValue(billingMocks.stripe);
  });

  it("returns a safe free-plan shape when the session is invalid", async () => {
    billingMocks.getVerifiedSession.mockResolvedValue({
      user: null,
      error: "Your session has expired. Please log in again.",
    });

    const result = await getUserBillingAction();

    expect(result).toEqual({
      data: {
        planId: "free",
        status: "free",
        stripePriceId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        hasStripeCustomer: false,
      },
      error: "Your session has expired. Please log in again.",
    });
  });

  it("maps stored billing rows into client-safe billing details", async () => {
    const result = await getUserBillingAction();

    expect(billingMocks.supabase.from).toHaveBeenCalledWith("user_billing");
    expect(billingMocks.supabase.query.eq).toHaveBeenCalledWith("user_id", "user_owner");
    expect(result).toEqual({
      data: {
        planId: "plus",
        status: "active",
        stripePriceId: "price_plus_monthly_test",
        currentPeriodEnd: "2026-12-31T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        hasStripeCustomer: true,
      },
      error: null,
    });
  });

  it("rejects checkout for the free plan before calling Stripe", async () => {
    const result = await createCheckoutSessionAction({ planId: "free" });

    expect(result).toEqual({
      url: null,
      error: "The free plan does not need checkout.",
    });
    expect(billingMocks.getStripe).not.toHaveBeenCalled();
  });

  it("creates a Stripe checkout session with authenticated user metadata", async () => {
    const result = await createCheckoutSessionAction({
      planId: "plus",
      interval: "monthly",
    });

    expect(billingMocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_test",
        customer_email: undefined,
        line_items: [{ price: "price_plus_monthly_test", quantity: 1 }],
        success_url: "http://localhost:3000/profile?billing=success",
        cancel_url: "http://localhost:3000/profile?billing=cancelled",
        metadata: {
          userId: "user_owner",
          planId: "plus",
          interval: "monthly",
        },
        subscription_data: {
          metadata: {
            userId: "user_owner",
            planId: "plus",
            interval: "monthly",
          },
        },
      })
    );
    expect(result).toEqual({ url: "https://stripe.test/checkout", error: null });
  });

  it("rejects billing portal access when no Stripe customer exists", async () => {
    billingMocks.supabase = createBillingSupabase({ data: null, error: null });
    billingMocks.createClient.mockResolvedValue(billingMocks.supabase);

    const result = await createBillingPortalSessionAction();

    expect(result).toEqual({
      url: null,
      error: "No Stripe customer was found for this account.",
    });
    expect(billingMocks.getStripe).not.toHaveBeenCalled();
  });

  it("creates a Stripe billing portal session for the authenticated customer", async () => {
    const result = await createBillingPortalSessionAction();

    expect(billingMocks.stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_test",
      return_url: "http://localhost:3000/profile",
    });
    expect(result).toEqual({ url: "https://stripe.test/portal", error: null });
  });

  it("returns safe errors when Stripe checkout fails", async () => {
    billingMocks.stripe.checkout.sessions.create.mockRejectedValue(new Error("Stripe down"));

    const result = await createCheckoutSessionAction({
      planId: "family",
      interval: "yearly",
    });

    expect(result).toEqual({ url: null, error: "Stripe down" });
  });
});

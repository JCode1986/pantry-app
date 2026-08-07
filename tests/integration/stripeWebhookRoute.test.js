import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStripeMock } from "@/tests/mocks/stripe";
import { createSupabaseMock, createSupabaseResponse } from "@/tests/mocks/supabase";

const webhookMocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  getStripe: vi.fn(),
  stripe: null,
  admin: null,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: webhookMocks.createAdminClient,
}));

vi.mock("@/utils/stripe", () => ({
  getStripe: webhookMocks.getStripe,
}));

const { POST } = await import("@/app/api/stripe/webhook/route");

function createWebhookRequest(body = "{}", signature = "sig_test") {
  return new Request("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": signature,
    },
    body,
  });
}

async function readJson(response) {
  return response.json();
}

function createSubscription(overrides = {}) {
  return {
    id: "sub_test",
    customer: "cus_test",
    status: "active",
    current_period_end: 1798761600,
    cancel_at_period_end: false,
    metadata: {
      userId: "user_owner",
      planId: "plus",
    },
    items: {
      data: [{ price: { id: "price_plus_monthly_test" } }],
    },
    ...overrides,
  };
}

describe("Stripe webhook API route", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    webhookMocks.stripe = createStripeMock();
    webhookMocks.admin = createSupabaseMock({
      user_billing: createSupabaseResponse(),
    });
    webhookMocks.getStripe.mockReturnValue(webhookMocks.stripe);
    webhookMocks.createAdminClient.mockReturnValue(webhookMocks.admin);
  });

  it("fails clearly when the webhook secret is not configured", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

    const response = await POST(createWebhookRequest());

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toMatchObject({
      error: "Stripe webhook secret is not configured.",
    });
    expect(webhookMocks.getStripe).not.toHaveBeenCalled();
  });

  it("rejects invalid webhook signatures", async () => {
    webhookMocks.stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(createWebhookRequest("raw-body", "bad_sig"));

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toMatchObject({
      error: "Invalid signature",
    });
  });

  it("acknowledges checkout completion without mutating billing directly", async () => {
    webhookMocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_test" } },
    });

    const response = await POST(createWebhookRequest("checkout-body"));

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ received: true });
    expect(webhookMocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("upserts user billing from subscription created and updated events", async () => {
    const subscription = createSubscription();
    webhookMocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: { object: subscription },
    });

    const response = await POST(createWebhookRequest("subscription-body"));

    const query = webhookMocks.admin.__queries.get("user_billing");
    expect(query.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_owner",
        plan_id: "plus",
        status: "active",
        stripe_customer_id: "cus_test",
        stripe_subscription_id: "sub_test",
        stripe_price_id: "price_plus_monthly_test",
        cancel_at_period_end: false,
      }),
      { onConflict: "user_id" }
    );
    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ received: true });
  });

  it("marks subscriptions deleted as free and canceled", async () => {
    const subscription = createSubscription({
      status: "canceled",
      cancel_at_period_end: true,
    });
    webhookMocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: subscription },
    });

    const response = await POST(createWebhookRequest("delete-body"));

    const query = webhookMocks.admin.__queries.get("user_billing");
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan_id: "free",
        status: "canceled",
        stripe_subscription_id: "sub_test",
        stripe_price_id: null,
        cancel_at_period_end: false,
      })
    );
    expect(query.eq).toHaveBeenCalledWith("user_id", "user_owner");
    expect(response.status).toBe(200);
  });

  it("returns safe errors when billing persistence fails", async () => {
    webhookMocks.admin = createSupabaseMock({
      user_billing: createSupabaseResponse({
        error: { message: "Database unavailable" },
      }),
    });
    webhookMocks.createAdminClient.mockReturnValue(webhookMocks.admin);
    webhookMocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: createSubscription() },
    });

    const response = await POST(createWebhookRequest("subscription-body"));

    expect(response.status).toBe(500);
    await expect(readJson(response)).resolves.toMatchObject({
      error: "Database unavailable",
    });
  });
});

"use server";

import { headers } from "next/headers";
import { getSession } from "@/lib/sessionOptions";
import { createClient } from "@/utils/supabase/server";
import {
  BILLING_INTERVALS,
  getBillingPlan,
  getStripePriceId,
} from "@/utils/billingPlans";
import { getStripe } from "@/utils/stripe";

function billingError(message) {
  return { url: null, error: message };
}

async function getAuthedBillingContext() {
  const session = await getSession();
  const user = session?.user?.user;

  if (!session?.user?.access_token || !user?.id) {
    return {
      user: null,
      billing: null,
      error: "Your session has expired. Please log in again.",
    };
  }

  const supabase = await createClient();
  const { data: billing, error } = await supabase
    .from("user_billing")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return {
      user,
      billing: null,
      error: error.message || "Could not load billing details.",
    };
  }

  return { user, billing, error: null };
}

async function getAppUrl() {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost || headersList.get("host");
  const forwardedProto = headersList.get("x-forwarded-proto") || "https";
  const requestUrl = host ? `${forwardedProto}://${host}` : null;
  const candidates = [
    origin,
    requestUrl,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      // Ignore malformed deployment env/header values and keep falling back.
    }
  }

  return "http://localhost:3000";
}

export async function getUserBillingAction() {
  const { billing, error } = await getAuthedBillingContext();

  if (error) {
    return {
      data: {
        planId: "free",
        status: "free",
        stripePriceId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        hasStripeCustomer: false,
      },
      error,
    };
  }

  return {
    data: {
      planId: billing?.plan_id || "free",
      status: billing?.status || "free",
      stripePriceId: billing?.stripe_price_id || null,
      currentPeriodEnd: billing?.current_period_end || null,
      cancelAtPeriodEnd: Boolean(billing?.cancel_at_period_end),
      hasStripeCustomer: Boolean(billing?.stripe_customer_id),
    },
    error: null,
  };
}

export async function createCheckoutSessionAction({
  planId,
  interval = BILLING_INTERVALS.monthly,
}) {
  const plan = getBillingPlan(planId);
  if (plan.id === "free") {
    return billingError("The free plan does not need checkout.");
  }

  const normalizedInterval =
    interval === BILLING_INTERVALS.yearly
      ? BILLING_INTERVALS.yearly
      : BILLING_INTERVALS.monthly;
  const priceId = getStripePriceId(plan.id, normalizedInterval);

  if (!priceId) {
    return billingError(
      `Missing Stripe price id for ${plan.name} ${normalizedInterval}.`
    );
  }

  const { user, billing, error } = await getAuthedBillingContext();
  if (error) return billingError(error);

  try {
    const stripe = getStripe();
    const appUrl = await getAppUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: billing?.stripe_customer_id || undefined,
      customer_email: billing?.stripe_customer_id ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/profile?billing=success`,
      cancel_url: `${appUrl}/profile?billing=cancelled`,
      metadata: {
        userId: user.id,
        planId: plan.id,
        interval: normalizedInterval,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: plan.id,
          interval: normalizedInterval,
        },
      },
    });

    return { url: checkoutSession.url, error: null };
  } catch (err) {
    return billingError(err?.message || "Could not start checkout.");
  }
}

export async function createBillingPortalSessionAction() {
  const { billing, error } = await getAuthedBillingContext();
  if (error) return billingError(error);

  if (!billing?.stripe_customer_id) {
    return billingError("No Stripe customer was found for this account.");
  }

  try {
    const stripe = getStripe();
    const appUrl = await getAppUrl();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${appUrl}/profile`,
    });

    return { url: portalSession.url, error: null };
  } catch (err) {
    return billingError(err?.message || "Could not open billing portal.");
  }
}

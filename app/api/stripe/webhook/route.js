import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe } from "@/utils/stripe";

export const runtime = "nodejs";

function planFromMetadata(subscription) {
  return subscription?.metadata?.planId || "free";
}

async function upsertBillingFromSubscription(subscription) {
  const userId = subscription?.metadata?.userId;
  if (!userId) return;

  const item = subscription.items?.data?.[0];
  const supabase = createAdminClient();

  await supabase.from("user_billing").upsert(
    {
      user_id: userId,
      plan_id: planFromMetadata(subscription),
      status: subscription.status,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      stripe_price_id: item?.price?.id || null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

async function markSubscriptionDeleted(subscription) {
  const userId = subscription?.metadata?.userId;
  if (!userId) return;

  const supabase = createAdminClient();
  await supabase
    .from("user_billing")
    .update({
      plan_id: "free",
      status: "canceled",
      stripe_subscription_id: subscription.id,
      stripe_price_id: null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function POST(request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook secret is not configured." },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Invalid webhook signature." },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.mode === "subscription" && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await upsertBillingFromSubscription(subscription);
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    await upsertBillingFromSubscription(event.data.object);
  }

  if (event.type === "customer.subscription.deleted") {
    await markSubscriptionDeleted(event.data.object);
  }

  return NextResponse.json({ received: true });
}

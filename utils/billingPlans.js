export const BILLING_INTERVALS = {
  monthly: "monthly",
  yearly: "yearly",
};

export const ACTIVE_BILLING_STATUSES = ["active", "trialing"];

export const BILLING_PLANS = [
  {
    id: "free",
    name: "Free",
    audience: "Try WhereKeep",
    description: "For proving the workflow with one location before upgrading.",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    monthlyPriceIdEnv: null,
    yearlyPriceIdEnv: null,
    cta: "Current free plan",
    limits: {
      users: 1,
      locations: 1,
      items: 50,
    },
    features: [
      "1 user",
      "1 location",
      "50 items",
      "Basic locations, areas, categories, and items",
      "Basic search and shopping list",
      "Barcode and photo-assisted item entry",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    audience: "Best for one household manager",
    description: "Unlimited organization for the person managing the household.",
    monthlyPrice: "$4.99",
    yearlyPrice: "$49",
    monthlyPriceIdEnv: "STRIPE_PLUS_MONTHLY_PRICE_ID",
    yearlyPriceIdEnv: "STRIPE_PLUS_YEARLY_PRICE_ID",
    featured: true,
    cta: "Start Plus",
    limits: {
      users: 1,
      locations: null,
      items: null,
    },
    features: [
      "Unlimited items",
      "Unlimited locations, areas, and categories",
      "Global item search",
      "Advanced item filters",
      "Shopping list workflow",
      "Recent activity",
      "Barcode-assisted product lookup",
      "Inventory photos",
      "Quantity and expiration tracking",
      "Theme and font customization",
    ],
  },
  {
    id: "family",
    name: "Family",
    audience: "Best for shared households",
    description: "Built for households that need shared access without shared chaos.",
    monthlyPrice: "$8.99",
    yearlyPrice: "$89",
    monthlyPriceIdEnv: "STRIPE_FAMILY_MONTHLY_PRICE_ID",
    yearlyPriceIdEnv: "STRIPE_FAMILY_YEARLY_PRICE_ID",
    cta: "Start Family",
    limits: {
      users: 5,
      locations: null,
      items: null,
    },
    features: [
      "Everything in Plus",
      "3-5 household members",
      "Shared inventory",
      "Owner, editor, and viewer roles",
      "Activity history by user",
      "Household invite management",
      "Shared shopping and restocking workflow",
    ],
  },
];

export function getBillingPlan(planId) {
  return BILLING_PLANS.find((plan) => plan.id === planId) || BILLING_PLANS[0];
}

export function getEffectivePlanId(billing = {}) {
  const planId = billing?.plan_id || billing?.planId || "free";
  const status = billing?.status || "free";

  if (planId !== "free" && ACTIVE_BILLING_STATUSES.includes(status)) {
    return planId;
  }

  return "free";
}

export function getEffectiveBillingPlan(billing = {}) {
  return getBillingPlan(getEffectivePlanId(billing));
}

export function getEffectivePlanLimits(billing = {}) {
  return getEffectiveBillingPlan(billing).limits;
}

export function getStripePriceId(planId, interval) {
  const plan = getBillingPlan(planId);
  const envName =
    interval === BILLING_INTERVALS.yearly
      ? plan.yearlyPriceIdEnv
      : plan.monthlyPriceIdEnv;

  return envName ? process.env[envName] : null;
}

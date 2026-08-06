export function assertSafeTestEnvironment(env = process.env) {
  const appUrl = env.NEXT_PUBLIC_APP_URL || "";
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const stripeKey = env.STRIPE_SECRET_KEY || "";

  if (/wherekeep\.com/i.test(appUrl)) {
    throw new Error("Tests must not target the production WhereKeep URL.");
  }

  if (/supabase\.co/i.test(supabaseUrl) && !/localhost|127\.0\.0\.1|test/i.test(supabaseUrl)) {
    throw new Error("Tests must not target a production Supabase project.");
  }

  if (stripeKey.startsWith("sk_live_")) {
    throw new Error("Tests must not use a live Stripe secret key.");
  }

  return true;
}

import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.SECRET_COOKIE_PASSWORD ??= "test-secret-cookie-password-with-32-chars";
process.env.STRIPE_SECRET_KEY ??= "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_test_placeholder";
process.env.STRIPE_PLUS_MONTHLY_PRICE_ID ??= "price_plus_monthly_test";
process.env.STRIPE_PLUS_YEARLY_PRICE_ID ??= "price_plus_yearly_test";
process.env.STRIPE_FAMILY_MONTHLY_PRICE_ID ??= "price_family_monthly_test";
process.env.STRIPE_FAMILY_YEARLY_PRICE_ID ??= "price_family_yearly_test";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

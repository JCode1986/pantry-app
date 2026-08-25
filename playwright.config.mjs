import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
const isWindows = process.platform === "win32";

function assertSafePlaywrightEnvironment() {
  if (/wherekeep\.com/i.test(baseURL)) {
    throw new Error("Playwright tests must not target the production WhereKeep URL.");
  }

  if ((process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live_")) {
    throw new Error("Playwright tests must not run with a live Stripe secret key.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (/supabase\.co/i.test(supabaseUrl) && !/localhost|127\.0\.0\.1|test/i.test(supabaseUrl)) {
    throw new Error("Playwright tests must not run against a production Supabase project.");
  }
}

assertSafePlaywrightEnvironment();

const testEnv = {
  ...process.env,
  NEXT_PUBLIC_APP_URL: baseURL,
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  WHEREKEEP_E2E_AUTH_MOCK: "1",
  SECRET_COOKIE_PASSWORD: "test-secret-cookie-password-with-32-chars",
  STRIPE_SECRET_KEY: "sk_test_placeholder",
  STRIPE_WEBHOOK_SECRET: "whsec_test_placeholder",
  STRIPE_PLUS_MONTHLY_PRICE_ID: "price_plus_monthly_test",
  STRIPE_PLUS_YEARLY_PRICE_ID: "price_plus_yearly_test",
  STRIPE_FAMILY_MONTHLY_PRICE_ID: "price_family_monthly_test",
  STRIPE_FAMILY_YEARLY_PRICE_ID: "price_family_yearly_test",
  OPENAI_API_KEY: "",
};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: isWindows
          ? "npx.cmd next dev --turbopack -p 3100"
          : "npx next dev --turbopack -p 3100",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: testEnv,
      },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});

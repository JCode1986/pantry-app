import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "."),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.js"],
    include: ["tests/**/*.{test,spec}.{js,jsx}"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: [
        "app/actions/activity.js",
        "app/actions/auth.js",
        "app/actions/billing.js",
        "app/actions/shoppingList.js",
        "app/api/stripe/webhook/route.js",
        "app/api/sync-session/route.js",
        "components/app-shell/authenticatedShellState.js",
        "components/dashboard/StatsCards.jsx",
        "lib/verifiedSession.js",
        "utils/appPreferences.js",
        "utils/billingPlans.js",
        "utils/householdRoles.js",
        "utils/pantry/*.js",
        "utils/urlSecurity.js",
      ],
      exclude: [
        ".next/**",
        "coverage/**",
        "node_modules/**",
        "public/**",
        "tests/**",
        "**/*.config.*",
        "next.config.mjs",
        "postcss.config.mjs",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 60,
      },
    },
  },
});

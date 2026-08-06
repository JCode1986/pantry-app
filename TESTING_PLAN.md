# Testing Plan

## Current architecture

WhereKeep is a JavaScript-only Next.js 15 App Router application using React 19, Tailwind CSS 4, Supabase Auth/database/storage, Iron Session, Stripe billing, and local native UI components. The package manager is npm, confirmed by `package-lock.json`.

Authenticated routes live under `app/(authenticated)/` and are protected by `middleware.js`. Server behavior is concentrated in server actions under `app/actions/`, API routes under `app/api/`, Supabase clients under `utils/supabase/`, session helpers under `lib/`, and shared business logic under `utils/`.

Major server boundaries:

- Auth/session: `app/actions/auth.js`, `middleware.js`, `lib/sessionOptions.js`, `lib/verifiedSession.js`, `app/api/sync-session/route.js`.
- Inventory: `app/actions/server.js`, `app/actions/quickAdd.js`, `utils/pantry/*`, `utils/inventoryImages.js`.
- Household permissions: `app/actions/household.js`, `utils/households.js`.
- Billing/subscriptions: `app/actions/billing.js`, `utils/billingPlans.js`, `utils/stripe.js`, `app/api/stripe/webhook/route.js`.
- Shopping list/activity: `app/actions/shoppingList.js`, `app/actions/activity.js`.
- Preferences/UI helpers: `utils/appPreferences.js`, `components/ui/*`, app-shell components.

## Existing test coverage

There are currently no test files, no Vitest/Jest/Playwright config, no CI workflow, and no package scripts for tests. The only verification script currently present is `npm run build`. The repo also does not currently include an ESLint config or type-check script.

## Proposed testing stack

- Unit and integration tests: Vitest.
- Component tests: React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom`, jsdom.
- Coverage: Vitest V8 coverage with text, HTML, and LCOV output.
- API/network mocking: direct dependency mocks for isolated server actions; add Mock Service Worker later only if route/component tests need request-level interception.
- End-to-end tests: Playwright in a focused Chromium desktop and mobile setup.

## Critical flows

- Authentication: login validation, logout, session sync, expired/invalid sessions, protected-route redirects, guest-only redirects, safe redirect handling.
- Authorization: owner/editor/viewer behavior, non-member rejection, invitation lifecycle, owner-only actions, server-side rejection for unauthorized direct calls.
- Inventory data integrity: locations, storage areas, categories, items, item moves, item deletion, household scoping, parent-child relationship validation.
- Search/filter/sort: query normalization, empty and error states, household isolation, mobile and desktop filter flows.
- Shopping list: create/update/delete/complete/restore flows, low-stock handoff, permissions, household isolation.
- Dashboard/activity: calculations, previews, ordering, pagination, deleted-entity behavior, partial failures.
- Billing/subscriptions: effective plan detection, status handling, limits, feature gates, Stripe checkout/portal/webhook behavior.
- Responsive/accessibility: mobile navigation, global add/search, dialogs/drawers, keyboard dismissal, accessible labels and dialog names.

## Mocking strategy

Unit tests will mock at the dependency boundary, not inside the function under test. Supabase clients, Stripe clients, Iron Session, `next/cache`, `next/navigation`, and external `fetch` calls will be mocked in shared helpers. Pure utilities will run without mocks.

Component tests will render through shared providers and use semantic Testing Library queries. Tests will avoid generated CSS selectors and snapshots except for very small stable data structures if needed.

Server-action and API-route tests will use deterministic fixture users, households, roles, and Supabase response builders. Unauthorized direct calls will be tested against action/route boundaries instead of relying on hidden UI controls.

## Test database strategy

Phase 1 will not connect to Supabase. Unit and integration tests will use repository-level mocks and fixtures that mirror Supabase response shapes.

End-to-end tests must never target production Supabase or live Stripe. E2E configuration will fail fast if pointed at a production URL or production-looking credentials. If a local Supabase setup is added later, tests can opt into it through explicit test-only environment variables. Otherwise, Playwright will use mocked or seeded test flows and Stripe test-mode/mocked endpoints.

## Implementation phases

1. Add the test foundation: dependencies, scripts, Vitest config, shared setup, environment example, test folders, helpers/mocks, and initial utility/business-logic tests.
2. Add auth, session, household role/permission, plan/subscription, and Supabase/session mock tests.
3. Add inventory, search/filter/sort, shopping list, dashboard, and activity tests.
4. Add API route, server action, Stripe checkout/portal/webhook, and error-handling tests.
5. Add Playwright config, core E2E flows, mobile E2E coverage, CI workflow, and testing documentation.

Each phase should run the relevant test command and `npm run build` before continuing. Lint/type-check verification will be added only if the repo gains those scripts/configs.

## Risks and limitations

- Several important behaviors currently live inside large UI components or large server-action files. Small behavior-preserving extraction may be needed before meaningful tests can target them.
- The current repo has no lint/type-check setup, so CI cannot honestly run those checks until they are added separately.
- Full auth, invitation, and billing E2E coverage depends on safe test infrastructure. Until that exists, these paths should be covered through route/action tests and mocked E2E flows.
- Supabase Row Level Security cannot be fully verified from application mocks. Where practical, tests should document expected SQL/RLS checks, but real RLS verification requires a safe test database.
- Coverage thresholds should start realistic and focus on meaningful business logic instead of forcing low-value UI assertions.

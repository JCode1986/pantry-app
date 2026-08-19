# Testing

## Install dependencies

```bash
npm install
```

The test dependencies are committed in `package.json` and `package-lock.json`.

## Environment

Copy `.env.test.example` to `.env.test` for local test-only values if needed. Do not put production Supabase, Stripe, OpenAI, or customer data in test env files. `.env.test` is ignored by the existing `.gitignore` through `.env*`.

Unit and integration tests use mocks for Supabase, Stripe, sessions, and external requests. Playwright also injects safe placeholder environment variables into its local web server by default.

## Commands

```bash
npm run test
npm run test:watch
npm run test:unit
npm run test:coverage
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:all
npm run build
```

This repo currently has no ESLint config or type-check script, so lint/type-check commands are not part of the test workflow yet. `next build` still runs Next's build-time checks.

## Test layout

```text
tests/
  component/       React component behavior tests
  e2e/             Playwright tests
  helpers/         Shared render, fixture, and safety helpers
  integration/     Server action and API route tests with mocked boundaries
  mocks/           Supabase, Stripe, and session mocks
  unit/            Pure utility and business-logic tests
```

## Fixtures and mocks

- `tests/helpers/factories.js` creates deterministic users, households, locations, storage areas, categories, items, shopping-list entries, tasks, and role fixtures.
- `tests/mocks/supabase.js` provides chainable Supabase query mocks with sequential table responses.
- `tests/mocks/stripe.js` provides checkout, billing portal, and webhook mocks.
- `tests/mocks/session.js` provides Iron Session and verified-session shapes.

## Adding tests

Prefer tests that cover user-visible behavior, data integrity, permissions, plan limits, and safe error handling. Use Testing Library role and label queries for components. Use Playwright role and label queries for E2E tests. Avoid snapshots unless the serialized output is very small and intentionally stable.

## Coverage

Coverage uses Vitest with V8 and outputs text, HTML, and LCOV reports. The current coverage scope is intentionally focused on modules covered by the implemented phases. Expand `coverage.include` as additional business logic is covered.

Current thresholds:

- Lines: 70%
- Functions: 70%
- Statements: 70%
- Branches: 60%

## Playwright safety

Playwright fails immediately if pointed at `wherekeep.com`, a live Stripe key, or a production-looking Supabase URL from the process environment. The default local web server uses placeholder test env values.

The current E2E suite covers public pages, login form accessibility, invalid sign-in behavior, and unauthenticated protected-route redirects. Full authenticated inventory, permission, and subscription E2E flows still require an isolated test Supabase project or equivalent local test backend.

## Current task coverage

Task coverage includes:

- Unit tests for task grouping, overdue/due-today/upcoming detection, summary counts, priority sorting, recurrence calculations, payload validation, and permission checks.
- Integration tests for creating, loading, editing, assigning, completing, reopening, deleting, recurring next-occurrence generation, viewer/editor restrictions, and cross-household rejection.
- Component tests for task filters, mobile tab behavior, task cards, completion controls, action visibility, completed task edit restrictions, toasts, and error display.
- Activity integration tests for task activity fallback loading, task-only filtering, non-task filtering, actor fallback, and merged ordering.
- Dropdown component tests for viewport-aware menu placement near the bottom of the screen.

## CI

GitHub Actions runs dependency install, unit/integration/component tests, coverage, production build, Playwright browser install, and focused Playwright tests. Playwright reports are uploaded on failure.

## Debugging

Use watch mode for fast local feedback:

```bash
npm run test:watch
```

Use headed Playwright when debugging browser behavior:

```bash
npm run test:e2e:headed
```

Open the HTML coverage report from `coverage/index.html` after running coverage.

## Known gaps

- Full authenticated E2E CRUD flows are not enabled until a safe isolated test backend exists.
- The authenticated Tasks Playwright flow is not enabled until a safe isolated test backend exists.
- Supabase Row Level Security is not verified by application mocks.
- Large inventory page clients still need targeted component or extracted-logic tests.

## RLS Checklist

When a safe test Supabase project or local Supabase stack exists, add SQL/RLS tests that verify:

- Owners can read and mutate their household data.
- Editors can mutate inventory and shopping-list data but cannot manage owner-only household settings.
- Viewers can read household data but cannot create, update, or delete inventory/shopping records.
- Non-members cannot read, update, delete, or infer another household's private data.
- Guessing IDs across households is rejected for reads and writes.
- Invite tokens cannot be reused after revocation, expiration, or acceptance.
- Owner role cannot be self-elevated or reassigned through direct database writes.
- Billing and subscription rows cannot be read or modified by unrelated users.
- Tasks can only be read by household members.
- Owners and editors can create, edit, assign, and delete household tasks according to the server policy.
- Viewers cannot create, edit, assign, delete, or modify another member's task.
- Household members can complete or reopen only tasks assigned to themselves or unassigned.
- Recurring task completion cannot create duplicate future occurrences after repeated completion requests.

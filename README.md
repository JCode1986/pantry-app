# WhereKeep

WhereKeep is a household inventory app for tracking what you have, where it is stored, and what needs attention. The app supports shared households, role-based editing, locations, storage areas, categories, item search, shopping lists, expiration tracking, inventory images, barcode-assisted item entry, billing plans, and session management.

The project is built with Next.js App Router, Supabase, Iron Session, HeroUI, Tailwind CSS, Stripe, and Framer Motion.

## Features

- Household inventory organized by locations, storage areas, categories, and items.
- Global item search and item creation from the app shell.
- Quantity and expiration tracking with dashboard notifications.
- Shopping list workflow for restocking.
- Shared household support with owner, editor, and viewer roles.
- Role-aware editing so viewers can browse without changing inventory.
- Household invites and profile management.
- Recent activity tracking.
- Barcode-assisted item entry and inventory images.
- Theme and font preferences.
- Stripe-backed Free, Plus, and Family billing plans.
- Supabase authentication with Iron Session-backed app sessions.
- Inactivity timeout modal with a countdown before logout.

## Tech Stack

- Next.js 15 App Router
- React 19
- JavaScript
- Tailwind CSS
- HeroUI
- Supabase Auth and database access
- Iron Session for the app session cookie
- Stripe for billing and webhooks
- Framer Motion
- Recharts

## Getting Started

Install dependencies:

```bash
npm install
```

Create `.env.local` with the required environment variables:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SECRET_COOKIE_PASSWORD=at_least_32_characters_for_iron_session

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PLUS_MONTHLY_PRICE_ID=your_plus_monthly_price_id
STRIPE_PLUS_YEARLY_PRICE_ID=your_plus_yearly_price_id
STRIPE_FAMILY_MONTHLY_PRICE_ID=your_family_monthly_price_id
STRIPE_FAMILY_YEARLY_PRICE_ID=your_family_yearly_price_id
```

Stripe variables are only required for billing checkout and webhook flows. The Supabase URL, anon key, service role key, and Iron Session secret are required for the authenticated app.

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

On Windows PowerShell, `npm.ps1` may be blocked by the local execution policy. If that happens, run scripts through `cmd`:

```bash
cmd /c npm run dev
cmd /c npm run build
```

## Available Scripts

```bash
npm run dev
```

Starts the Next.js development server with Turbopack.

```bash
npm run build
```

Builds the production app.

```bash
npm run start
```

Starts the production server after a successful build.

```bash
npm run lint
```

Runs the configured lint command. This repo currently uses `next lint`, which may prompt for ESLint setup if no ESLint config exists.

## Authentication And Sessions

WhereKeep uses both Supabase and Iron Session:

- Supabase handles user authentication and auth cookies.
- Iron Session stores the app session in the `pantry_session` HTTP-only cookie.
- Middleware uses Supabase to protect authenticated routes.
- Server actions and layouts read the Iron Session and can fall back to Supabase when needed.
- Logout must clear both layers.

The shared logout action in `app/actions/auth.js` destroys the Iron Session and signs out with the server Supabase client so the Supabase auth cookies are also expired.

Protected routes include:

- `/locations`
- `/storage-areas`
- `/areas`
- `/storage`
- `/categories`
- `/items`
- `/shopping-list`
- `/profile`

## Inactivity Logout

Authenticated users receive an inactivity warning before automatic logout. This applies to all signed-in users, including owners, editors, and viewers.

The timer is implemented in `components/app-shell/InactivityLogout.jsx` and mounted once from `components/app-shell/Providers.jsx`. The root layout passes the server-authenticated state into the provider so the inactivity timer starts even when the client Supabase session is not immediately available.

Current production timing:

```js
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_DURATION_MS = 2 * 60 * 1000;
```

That means:

- The user is considered idle after 30 minutes.
- The warning modal appears after 28 minutes of inactivity.
- The countdown runs for 2 minutes.
- If the user does nothing, logout runs at 30 minutes.
- Clicking `Stay signed in` refreshes/keeps the session and resets the timer.
- Clicking `Log out` immediately clears both Iron Session and Supabase auth.

For local testing, temporarily use shorter values:

```js
const IDLE_TIMEOUT_MS = 45 * 1000;
const WARNING_DURATION_MS = 30 * 1000;
```

With those values, the modal appears after 15 seconds and counts down for 30 seconds. The warning duration must be shorter than the idle timeout.

Activity events currently watched:

- `pointerdown`
- `keydown`
- `wheel`
- `touchstart`
- `scroll`

Once the warning modal is visible, normal page activity does not dismiss it. The user must explicitly choose `Stay signed in` or `Log out`.

## Billing Plans

Billing plan definitions live in `utils/billingPlans.js`.

Plans:

- Free: 1 user, 1 location, 50 items.
- Plus: single household manager with unlimited inventory.
- Family: shared households with 3-5 members and roles.

Stripe checkout and webhook code reads price IDs from environment variables. Keep Stripe price IDs out of source control.

## Project Structure

```text
app/
  actions/              Server actions for auth, billing, inventory, households, preferences, and activity
  api/                  API routes for session sync and Stripe webhooks
  auth/                 Supabase auth confirmation route
  login/                Login page
  signup/               Signup page
  profile/              Profile and account management
  locations/            Location views
  areas/                Area views
  categories/           Category views
  items/                Item views
  shopping-list/        Shopping list views

components/
  app-shell/            Providers, navigation, preferences, inactivity logout
  auth/                 Login, forgot password, invite acceptance
  dashboard/            Dashboard cards and notifications
  inventory/            Inventory image manager
  items/                Item pages, modals, barcode scanner, global search/add
  locations/            Location and storage-area sections
  modals/               Shared modal theme and confirmation modal
  profile/              Profile client UI
  shopping-list/        Shopping list modals and client UI
  ui/                   Shared UI components

lib/
  SessionContext.js     Client Supabase session context and refresh loop
  sessionOptions.js     Iron Session cookie configuration
  verifiedSession.js    Server helper for verified session access
  supabaseClient.js     Browser Supabase client

utils/
  supabase/             Browser, server, middleware, and admin Supabase clients
  billingPlans.js       Billing plan metadata and Stripe price env mapping
  appPreferences.js     Theme/font preference helpers
  households.js         Household roles, limits, and membership helpers
  metadata.js           App metadata helpers
  stripe.js             Stripe client helper
```

## Development Notes

- Prefer server Supabase clients for server actions that need to read or mutate auth cookies.
- Use the shared `logoutAction()` for any logout flow so both session layers are cleared.
- Keep role checks on server-side actions; client role gates are only UI affordances.
- Do not rely on the inactivity countdown as the security boundary. Server session and middleware enforcement remain the source of truth.
- If auth behavior looks stale during development, restart the dev server and clear browser cookies for `localhost`.

## License

This project is private unless a license is added.

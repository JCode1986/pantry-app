# WhereKeep

WhereKeep is a household inventory app for tracking what you have, where it is stored, what needs attention, what needs to be bought again, and which household tasks need to be done. It supports shared households, role-based editing, locations, storage areas, categories, item search, shopping lists, household tasks and chores, expiration tracking, images, barcode-assisted item entry, voice-assisted quick add, billing plans, mobile-first workflows, activity tracking, and session management.

## Tech Stack

- Next.js 15 App Router
- React 19
- JavaScript
- Tailwind CSS 4
- Local native UI components
- Supabase Auth, database, and storage
- Iron Session for the app session cookie
- Stripe for billing and webhooks
- Local lightweight motion wrappers

## Getting Started

Install dependencies:

```bash
npm install
```

Create `.env.local`:

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

OPENAI_API_KEY=optional_for_ai_voice_quick_add
OPENAI_QUICK_ADD_MODEL=optional_model_override
```

Run locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start a production build:

```bash
npm run start
```

On Windows PowerShell, if `npm.ps1` is blocked by local execution policy, run scripts through `cmd`:

```bash
cmd /c npm run dev
cmd /c npm run build
```

## Routing

- `/` is the public marketing homepage and is statically prerendered.
- Signed-in users are redirected from `/` to `/dashboard`.
- `/dashboard` is the authenticated overview.
- Protected app routes live under `app/(authenticated)/` while keeping their public URL paths unchanged.
- Public support/legal/auth utility pages stay outside the authenticated route group so they can prerender where possible.

Protected routes include:

- `/dashboard`
- `/locations`
- `/areas`
- `/categories`
- `/items`
- `/shopping-list`
- `/tasks`
- `/activity`
- `/profile`

## Performance Notes

- The root layout only contains global document concerns: fonts, metadata, CSS, and the preference boot script.
- The authenticated app shell is isolated in `components/app-shell/AuthenticatedAppShell.jsx` and mounted by `app/(authenticated)/layout.jsx`.
- Public pages such as `/`, `/terms`, `/privacy`, `/contact`, and `/support` are static after build.
- Public image assets get long-lived immutable cache headers from `next.config.mjs`.
- Next Image is configured to emit AVIF/WebP variants and cache optimized images.
- Package import optimization is enabled for the icon packages used by the app.
- The support chatbot, tasks client, bulk move modal, and barcode scanner are lazy-loaded so they do not ship in initial route bundles until needed.
- App image helpers default to lazy loading and async decoding.
- Activity loading skips redundant task queries when filters cannot match task activity and skips image URL enrichment when no image paths are present.
- Navigation attention counts load inventory and task counts in parallel where possible.

Current verification commands:

```bash
npm run test:unit
npm run test:e2e
npm run build
```

This repo does not currently include an ESLint config or `lint` script. `next build` still runs Next's build-time validation.

Latest production build snapshot:

- Shared first-load JS: 103 kB
- Middleware: 74.9 kB
- `/tasks`: 1.3 kB route size, 104 kB first-load JS
- `/dashboard`: 4.69 kB route size, 137 kB first-load JS
- `/activity`: 173 B route size, 131 kB first-load JS

## Project Structure

```text
app/
  (authenticated)/      Protected app routes and authenticated layout
    activity/
    areas/
    categories/
    dashboard/
    items/
    locations/
    profile/
    shopping-list/
    tasks/
  actions/              Server actions for auth, billing, inventory, households, preferences, activity, and tasks
  api/                  API routes for session sync and Stripe webhooks
  auth/                 Supabase auth confirmation route
  contact/              Public contact page
  login/                Login page
  signup/               Signup page
  support/              Public support page
  terms/                Public terms page
  privacy/              Public privacy page

components/
  app-shell/            Authenticated shell, navigation, preferences, session timeout, support chat
  auth/                 Login, password reset, invite acceptance
  dashboard/            Dashboard cards and overview UI
  inventory/            Shared inventory image manager
  items/                Item pages, modals, barcode scanner, global search/add
  locations/            Location and storage-area sections
  marketing/            Public homepage sections and imagery
  modals/               Shared modal theme and controls
  profile/              Profile client UI
  shopping-list/        Shopping list page and modals
  tasks/                Tasks page client, cards, filters, editor, and completion UI
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
  inventoryImages.js    Image storage entity metadata and signed URL helpers
  metadata.js           App metadata helpers
  tasks.js              Task validation, permissions, grouping, sorting, and recurrence helpers
  stripe.js             Stripe client helper
```

## Authentication And Sessions

WhereKeep uses both Supabase and Iron Session:

- Supabase handles user authentication and auth cookies.
- Iron Session stores the app session in the `pantry_session` HTTP-only cookie.
- Middleware uses Supabase to protect authenticated routes.
- Server actions and layouts read the Iron Session and can fall back to Supabase when needed.
- Logout clears both session layers.

The shared logout action in `app/actions/auth.js` destroys the Iron Session and signs out with the server Supabase client so Supabase auth cookies are also expired.

## Images

Image upload logic is centralized through:

- `components/inventory/EntityImageManager.jsx`
- `app/actions/server.js`
- `utils/inventoryImages.js`

Supported image entity types:

- `location`
- `storage_area`
- `category`
- `item`
- `shopping_list_item`

Images are limited to JPG, PNG, WebP, or GIF files up to 5 MB. The app stores image paths in the database and serves signed URLs from the shared `inventory-images` Supabase Storage bucket.

## Tasks And Activity

Household tasks live under `/tasks` and are backed by the Supabase `tasks` table. Tasks support assignment, optional locations, due dates, priority, recurrence, completion, reopening, deletion, filtering, sorting, and mobile-friendly task cards.

Task permissions follow household roles:

- Owners and editors can create, edit, assign, delete, complete, and reopen household tasks.
- Owners and editors can create, edit, assign, and delete household tasks.
- Viewers can view household tasks but cannot create, edit, assign, or delete them.
- Any household member can complete or reopen a task only when it is assigned to them or unassigned.

Recurring chores use an occurrence-generation model: completing a recurring task keeps the completed record for history and creates the next task occurrence from the recurrence settings when needed.

Task create, update, completion, reopen, and delete actions write to `activity_events` and appear in Recent Activity. The activity page supports filtering by activity type, including locations, storage areas, categories, items, shopping list, and tasks. Navigation and notifications show open tasks due today or overdue.

Database migrations for tasks and task activity live under `supabase/migrations/`.

## Billing

Billing plan definitions live in `utils/billingPlans.js`.

Plans:

- Free: 1 user, 1 location, 50 items.
- Plus: single household manager with unlimited inventory.
- Family: shared households with 3-5 members and roles.

Stripe checkout and webhook code reads price IDs from environment variables. Keep Stripe price IDs out of source control.

## Development Notes

- Prefer server Supabase clients for server actions that need to read or mutate auth cookies.
- Use `logoutAction()` for logout flows so both session layers are cleared.
- Keep role checks on server actions; client role gates are UI affordances only.
- Use `modalTheme.js` for shared modal and sheet styling.
- Apply the user's selected color as an accent for controls, active states, icons, and modal headers.
- When adding image support for a new entity, update the Supabase schema, `INVENTORY_IMAGE_ENTITY`, `getImageEntityRecord`, and the relevant serializer.
- When adding task behavior, keep authorization in `app/actions/tasks.js` and pure rules in `utils/tasks.js`.
- If auth behavior looks stale during development, restart the dev server and clear browser cookies for `localhost`.

## License

This project is private unless a license is added.

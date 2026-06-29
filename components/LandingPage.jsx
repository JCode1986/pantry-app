import Image from 'next/image';
import Link from 'next/link';
import {
  FaArrowRight,
  FaBell,
  FaBoxOpen,
  FaLayerGroup,
  FaMapMarkedAlt,
  FaSearch,
} from 'react-icons/fa';
import PricingSection from '@/components/PricingSection';

const features = [
  {
    icon: FaMapMarkedAlt,
    title: 'Organize by real spaces',
    description:
      'Create locations like Home, Garage, Office, or Pantry. Add storage areas and categories so every item has a clear place.',
  },
  {
    icon: FaBoxOpen,
    title: 'Add items fast',
    description:
      'Use the global add item flow to create a location, area, category, and item in one place when something does not exist yet.',
  },
  {
    icon: FaSearch,
    title: 'Find anything quickly',
    description:
      'Search for an item and see exactly where it lives, even if similar items are stored in multiple places.',
  },
  {
    icon: FaBell,
    title: 'Stay aware',
    description:
      'Track quantities, expiration dates, recent activity, and updates so you know what changed and what needs restocking.',
  },
];

function PreviewRow({ label, value, tone = 'brand' }) {
  const toneClass =
    tone === 'warning'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] border-[var(--stocksense-brand-border)]';

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <span className="min-w-0 truncate text-sm font-medium text-gray-700">
        {label}
      </span>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

function InventoryPreview() {
  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--stocksense-brand)] text-white">
            <FaLayerGroup />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Inventory map</div>
            <div className="text-xs text-gray-500">Home / Pantry / Snacks</div>
          </div>
        </div>
        <div className="hidden rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-1 text-xs font-medium text-[var(--stocksense-brand)] sm:block">
          42 tracked items
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.2fr]">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-gray-400">Locations</div>
          <PreviewRow label="Home" value="32" />
          <PreviewRow label="Garage" value="8" />
          <PreviewRow label="Office" value="2" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-gray-400">Areas</div>
          <PreviewRow label="Pantry" value="18" />
          <PreviewRow label="Fridge" value="9" tone="warning" />
          <PreviewRow label="Cabinet" value="5" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-gray-400">Recent items</div>
          <PreviewRow label="Rice" value="Qty 2" />
          <PreviewRow label="Pasta sauce" value="Exp soon" tone="warning" />
          <PreviewRow label="Coffee filters" value="Qty 1" />
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="page-enter min-h-[100vh] bg-white text-gray-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]">
          <Image
            src="/stocksense-logo-2.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col px-5 py-6">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/icon.png"
                alt="StockSense"
                width={44}
                height={44}
                className="rounded-xl"
                priority
              />
              <span className="text-lg font-semibold tracking-tight text-[var(--stocksense-brand)]">
                StockSense
              </span>
            </Link>

            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Log in
              </Link>
              <Link
                href="/login?mode=create"
                className="rounded-xl bg-[var(--stocksense-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-95"
              >
                Create account
              </Link>
            </div>
          </nav>

          <div className="grid flex-1 content-center gap-10 py-14">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--stocksense-brand)] sm:text-5xl md:text-6xl">
                StockSense
              </h1>
              <p className="mt-5 max-w-2xl text-xl font-medium text-gray-800 sm:text-2xl">
                Know what you have, where it is, and what needs attention.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
                Track household inventory across locations, storage areas,
                categories, and items. Add things quickly, search across
                everything, and keep your stock organized without digging
                through every cabinet.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login?mode=create"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                >
                  Create account <FaArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Log in
                </Link>
              </div>
            </div>

            <InventoryPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                  <Icon />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <PricingSection />

      <section className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Start organizing your inventory today.
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create a clear place for every item and find it when you need it.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login?mode=create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            Create account <FaArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Log in
          </Link>
        </div>
      </section>
    </main>
  );
}

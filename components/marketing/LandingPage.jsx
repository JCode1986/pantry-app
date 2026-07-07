import Link from 'next/link';
import {
  FaArrowRight,
  FaBell,
  FaBoxOpen,
  FaCamera,
  FaChartLine,
  FaCheck,
  FaClipboardList,
  FaDollarSign,
  FaHome,
  FaLayerGroup,
  FaMapMarkedAlt,
  FaShoppingBasket,
  FaSearch,
  FaShieldAlt,
  FaStore,
  FaUsers,
  FaUserCheck,
} from 'react-icons/fa';
import PricingSection from '@/components/marketing/PricingSection';
import ComparePlansButton from '@/components/marketing/ComparePlansButton';
import SiteFooter from '@/components/app-shell/SiteFooter';
import WhereKeepLogo from '@/components/ui/WhereKeepLogo';

const heroProofPoints = [
  'Stop rebuying what you already own',
  'Search the exact shelf, bin, or category',
  'Restock from the same household list',
];

const problemSolutions = [
  {
    icon: FaMapMarkedAlt,
    problem: 'Someone says, "I know we have it somewhere."',
    solution:
      'WhereKeep turns "somewhere" into Home > Garage shelf > Tool bin > Power drill.',
  },
  {
    icon: FaCamera,
    problem: 'The label, box, or shelf matters more than a perfect database row.',
    solution:
      'Add a photo, scan a barcode, or speak the item in quickly, then keep moving.',
  },
  {
    icon: FaSearch,
    problem: 'Search needs to answer where, not just whether it exists.',
    solution:
      'Find by item name, barcode, location, storage area, category, stock, or expiration.',
  },
  {
    icon: FaBell,
    problem: 'Leftovers and pantry food disappear until they are expired.',
    solution:
      'Expiration and expired-item alerts surface what needs attention before it becomes waste.',
  },
  {
    icon: FaShoppingBasket,
    problem: 'The shopping list lives in a separate notes app.',
    solution:
      'Move needed items to the shopping list, buy them, then move them back into inventory.',
  },
  {
    icon: FaShieldAlt,
    problem: 'A shared list gets messy when everyone can change everything.',
    solution:
      'Owners, editors, and viewers keep the household useful without giving up control.',
  },
];

const outcomes = [
  {
    title: 'Before: the house gets searched twice',
    description:
      'A missing charger, tool, document, or pantry item turns into opened drawers, duplicate purchases, and messages asking who saw it last.',
  },
  {
    title: 'During: the item gets a real home',
    description:
      'WhereKeep stores the practical answer: location, storage area, category, item, quantity, photo, barcode, and expiration when it matters.',
  },
  {
    title: 'After: search becomes the household habit',
    description:
      'Instead of asking around or rebuying it, someone searches, sees the path, and knows whether it needs to be used, moved, or restocked.',
  },
  {
    title: 'When it runs out: restock stays connected',
    description:
      'Items can move into the shopping list with their photo, then return to inventory after purchase so the loop stays clean.',
  },
];

const conversionStats = [
  {
    value: 'Find',
    label: 'the exact place before buying again',
  },
  {
    value: 'Use',
    label: 'food before it expires',
  },
  {
    value: 'Restock',
    label: 'from the same inventory loop',
  },
];

const audiences = [
  {
    icon: FaHome,
    title: 'Busy homes',
    description:
      'Pantry, fridge leftovers, freezer meals, garage, bathroom, cleaning supplies, storage bins, and everything people forget where they put.',
    accent: 'var(--entity-location-accent)',
    soft: 'var(--entity-location-soft)',
    border: 'var(--entity-location-border)',
  },
  {
    icon: FaUsers,
    title: 'Shared households',
    description:
      'Give family members editor access, or keep kids and elderly relatives view-only so the data stays clean.',
    accent: 'var(--entity-shopping-accent)',
    soft: 'var(--entity-shopping-soft)',
    border: 'var(--entity-shopping-border)',
  },
  {
    icon: FaStore,
    title: 'Small shared spaces',
    description:
      'Let helpers or customers view what is available while the account owner controls who can change stored item details.',
    accent: 'var(--entity-item-accent)',
    soft: 'var(--entity-item-soft)',
    border: 'var(--entity-item-border)',
  },
];

const workflow = [
  {
    title: 'Map the messy spot',
    description: 'Start with the real place people already use: pantry, garage, closet, freezer, office, or storage room.',
  },
  {
    title: 'Give each item context',
    description: 'Attach the item to the shelf, bin, basket, area, photo, quantity, and status that will matter later.',
  },
  {
    title: 'Search before you rebuy',
    description: 'Use search, photos, shopping list status, and recent activity before adding another duplicate to the house.',
  },
];

const upgradeReasons = [
  {
    icon: FaChartLine,
    title: 'Plus removes the ceiling',
    description: 'Unlimited items, unlimited locations, advanced filters, recent activity, shopping workflow, and appearance customization.',
  },
  {
    icon: FaUsers,
    title: 'Family turns it into a shared system',
    description: 'Invite up to 5 household members and decide whether each person can edit or only view.',
  },
  {
    icon: FaUserCheck,
    title: 'View-only access protects the data',
    description: 'Useful for kids, elderly relatives, helpers, customers, or anyone who should see inventory without changing it.',
  },
];

const inventoryLoop = [
  {
    icon: FaCamera,
    title: 'Capture the thing',
    description: 'Add it by barcode, voice, manual entry, or photo without turning it into a long chore.',
  },
  {
    icon: FaMapMarkedAlt,
    title: 'Put it somewhere real',
    description: 'Choose the location, storage area, shelf, bin, or category someone would actually check.',
  },
  {
    icon: FaSearch,
    title: 'Find it later',
    description: 'Search by name, barcode, path, stock level, expiration window, or shopping state.',
  },
  {
    icon: FaClipboardList,
    title: 'Restock without losing context',
    description: 'Move items into the shopping list and back to inventory with photos and quantity intact.',
  },
];

const hierarchyLevels = [
  {
    icon: FaHome,
    label: 'Home or place',
    example: 'Home, school, work, store',
    description: 'The broad place where the item lives.',
    tone: 'brand',
  },
  {
    icon: FaLayerGroup,
    label: 'Room or area',
    example: 'Kitchen pantry, garage shelf',
    description: 'The physical room or storage area inside that place.',
    tone: 'success',
  },
  {
    icon: FaClipboardList,
    label: 'Container or shelf',
    example: 'White basket, shelf 1, bin A',
    description: 'The shelf, bin, basket, or grouping that makes the item easy to find.',
    tone: 'warning',
  },
  {
    icon: FaBoxOpen,
    label: 'Item',
    example: 'Granola bars, drill bits, printer paper',
    description: 'The actual thing with quantity, expiration, image, and activity.',
    tone: 'muted',
  },
];

const hierarchyExamples = [
  'Home > Kitchen pantry > White basket > Granola bars',
  'Home > Garage shelf > Tool bin > Power drill',
  'Work > Supply closet > Paper goods > Printer paper',
  'School > Classroom cabinet > Bin A > Glue sticks',
];

const spreadsheetComparison = [
  {
    oldWay: 'Rows get stale when multiple people update the same home list.',
    newWay: 'Roles decide who can edit, and recent activity shows what changed.',
  },
  {
    oldWay: 'Leftovers disappear in the fridge until they are wasted.',
    newWay: 'Expiration reminders surface takeout, restaurant leftovers, and pantry food before they are forgotten.',
  },
  {
    oldWay: 'A spreadsheet says "garage" but not which bin or shelf.',
    newWay: 'Places, rooms, containers, photos, and item details stay connected.',
  },
  {
    oldWay: 'Restocking happens in a separate notes app.',
    newWay: 'Shopping list items come from the same inventory system.',
  },
];

const roleRows = [
  {
    role: 'Owner',
    detail: 'Manages billing, invites, roles, and household inventory.',
    tone: 'brand',
  },
  {
    role: 'Editor',
    detail: 'Can add, update, move, delete, purchase, and restock items.',
    tone: 'success',
  },
  {
    role: 'Viewer',
    detail: 'Can browse inventory, shopping list, and activity without adding or editing access.',
    tone: 'muted',
  },
];

const faqs = [
  {
    question: 'Can I start small?',
    answer:
      'Yes. Start with one location and a handful of items, then upgrade when unlimited inventory is worth it.',
  },
  {
    question: 'What makes this better than a spreadsheet?',
    answer:
      'WhereKeep connects each item to a real place, shopping status, activity, permissions, and filters instead of leaving everyone to maintain rows manually.',
  },
  {
    question: 'Can people view inventory without changing it?',
    answer:
      'Yes. Family roles support view-only access for people who should see the data but not edit it.',
  },
  {
    question: 'Can it help reduce food waste?',
    answer:
      'Yes. Add expiration dates for leftovers, takeout, freezer meals, and pantry food so WhereKeep can surface what needs attention before it is forgotten.',
  },
];

function getPreviewToneClass(tone = 'brand') {
  if (tone === 'warning') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }

  if (tone === 'success') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (tone === 'muted') {
    return 'bg-slate-50 text-slate-600 border-slate-200';
  }

  return 'bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] border-[var(--stocksense-brand-border)]';
}

function PrimaryCta({ className = '' }) {
  return (
    <Link
      href="/signup"
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 ${className}`}
    >
      Start free <FaArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function SecondaryCta({ className = '' }) {
  return (
    <ComparePlansButton
      className={`inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 ${className}`}
    >
      Compare plans
    </ComparePlansButton>
  );
}

function PreviewRow({ label, value, tone = 'brand' }) {
  const toneClass = getPreviewToneClass(tone);

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

function PreviewMetric({ label, value, icon: Icon, tone = 'brand' }) {
  const toneClass = getPreviewToneClass(tone);

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function HeroStatStrip() {
  return (
    <div className="mt-7 grid max-w-2xl grid-cols-3 overflow-hidden rounded-2xl border border-white/80 bg-white/85 shadow-sm backdrop-blur">
      {conversionStats.map((stat) => (
        <div key={stat.label} className="border-r border-gray-200 px-3 py-3 last:border-r-0">
          <div className="text-xl font-semibold text-[var(--stocksense-brand)] sm:text-2xl">
            {stat.value}
          </div>
          <div className="mt-1 text-[11px] leading-4 text-gray-600 sm:text-xs">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchResultLine({ name, path, detail, tone = 'brand' }) {
  const toneClass = getPreviewToneClass(tone);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-800">{name}</div>
          <div className="mt-1 text-xs leading-5 text-gray-600">{path}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${toneClass}`}>
          Found
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-500">{detail}</div>
    </div>
  );
}

function InventoryPreview() {
  return (
    <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/70 bg-white/95 p-4 shadow-xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--stocksense-brand)] text-white">
            <FaLayerGroup />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Your home memory</div>
            <div className="text-xs text-gray-500">Find what you own and exactly where it lives</div>
          </div>
        </div>
        <div className="hidden rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-1 text-xs font-medium text-[var(--stocksense-brand)] sm:block">
          Household ready
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <PreviewMetric icon={FaHome} label="Spaces" value="4" />
        <PreviewMetric icon={FaBoxOpen} label="Things remembered" value="138" tone="success" />
        <PreviewMetric icon={FaBell} label="Need attention" value="9" tone="warning" />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1.2fr]">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-gray-600">Home spaces</div>
          <PreviewRow label="Home" value="104" />
          <PreviewRow label="Work" value="22" />
          <PreviewRow label="School" value="12" tone="muted" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-gray-600">Rooms and areas</div>
          <PreviewRow label="Kitchen pantry" value="58" />
          <PreviewRow label="Garage shelf" value="34" />
          <PreviewRow label="Classroom cabinet" value="12" tone="muted" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-gray-600">Stored in</div>
          <PreviewRow label="White basket" value="12" />
          <PreviewRow label="Blue document box" value="8" tone="success" />
          <PreviewRow label="Holiday bin" value="23" tone="warning" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-gray-600">Search anything</div>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-2 text-sm font-medium text-[var(--stocksense-brand)]">
            <FaSearch className="h-3.5 w-3.5" />
            Where are the batteries?
          </div>
          <SearchResultLine
            name="AA batteries"
            path="Home > Hall closet > Clear bin"
            detail="Updated 2 weeks ago"
          />
          <SearchResultLine
            name="Passport"
            path="Home > Bedroom closet > Blue document box"
            detail="Added with photo"
            tone="success"
          />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center">
      {eyebrow && (
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
          {eyebrow}
        </div>
      )}
      <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

function AudienceCard({ audience }) {
  const Icon = audience.icon;

  return (
    <article
      className="relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm"
      style={{ borderColor: audience.border }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: audience.accent }}
      />
      <div
        className="mb-4 grid h-11 w-11 place-items-center rounded-xl"
        style={{ backgroundColor: audience.soft, color: audience.accent }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{audience.title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{audience.description}</p>
    </article>
  );
}

function LoopStep({ step, index }) {
  const Icon = step.icon;

  return (
    <article className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
          <Icon />
        </div>
        <div className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-500">
          {String(index + 1).padStart(2, '0')}
        </div>
      </div>
      <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{step.description}</p>
    </article>
  );
}

function HierarchyLevelCard({ level, index }) {
  const Icon = level.icon;
  const toneClass = getPreviewToneClass(level.tone);

  return (
    <article className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl border ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-500">
          {index + 1}
        </span>
      </div>
      <h3 className="text-base font-semibold text-gray-900">{level.label}</h3>
      <p className="mt-1 text-sm font-medium text-[var(--stocksense-brand)]">
        {level.example}
      </p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{level.description}</p>
    </article>
  );
}

function HierarchySection() {
  return (
    <section className="border-y border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeader
          eyebrow="How it is organized"
          title="A simple hierarchy that matches real life."
          description="WhereKeep is built around the way people naturally ask for something: what home is it in, what room or area is it stored in, what shelf or container is it under, and what exact item am I looking for?"
        />

        <div className="grid gap-4 md:grid-cols-4">
          {hierarchyLevels.map((level, index) => (
            <HierarchyLevelCard key={level.label} level={level} index={index} />
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
            Example paths
          </div>
          <div className="grid gap-2 lg:grid-cols-4">
            {hierarchyExamples.map((example) => (
              <div
                key={example}
                className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-2 text-sm font-medium text-[var(--stocksense-brand)]"
              >
                {example}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonRow({ row }) {
  return (
    <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
      <div>
        <div className="mb-2 inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
          Spreadsheet drag
        </div>
        <p className="text-sm leading-6 text-gray-600">{row.oldWay}</p>
      </div>
      <div>
        <div className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          WhereKeep
        </div>
        <p className="text-sm leading-6 text-gray-700">{row.newWay}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-[100vh] bg-white text-gray-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50 to-sky-50">
        <picture aria-hidden="true">
          <source media="(max-width: 767px)" srcSet="/wherekeep-hero-mobile.jpg" />
          <img
            src="/wherekeep-hero.jpg"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-white/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white/45" />

        <div className="relative mx-auto flex min-h-[82vh] max-w-6xl flex-col px-5 py-6">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <WhereKeepLogo className="drop-shadow-sm" markClassName="h-14 max-w-[245px]" />
            </Link>

            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Log in
              </Link>
              <PrimaryCta className="hidden px-4 py-2 sm:inline-flex" />
            </div>
          </nav>

          <div className="grid flex-1 content-center gap-10 py-12">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex rounded-full border border-[var(--stocksense-brand-border)] bg-white/85 px-3 py-1 text-xs font-semibold text-[var(--stocksense-brand)] shadow-sm backdrop-blur">
                For the "where did we put it?" problem
              </div>
              <h1 className="text-5xl font-semibold tracking-tight text-[var(--stocksense-brand)] sm:text-6xl md:text-7xl">
                WhereKeep
              </h1>
              <p className="mt-5 max-w-2xl text-2xl font-semibold leading-tight text-gray-900 sm:text-3xl">
                Stop searching the house for things you already own.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
                WhereKeep gives each item a real home: pantry basket, closet
                box, garage shelf, freezer drawer, or storage bin. Add it fast,
                search the exact path later, and turn what ran out into a
                shopping list without losing the context.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <PrimaryCta />
                <SecondaryCta />
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-gray-700">
                {heroProofPoints.map((point) => (
                  <span
                    key={point}
                    className="rounded-full border border-gray-200 bg-white/85 px-3 py-1 shadow-sm"
                  >
                    {point}
                  </span>
                ))}
              </div>

              <HeroStatStrip />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <InventoryPreview />
        </div>
      </section>

      <HierarchySection />

      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <SectionHeader
            eyebrow="Fast capture"
            title="The app starts where the problem starts: putting something away."
            description="You should not need a perfect cataloging session. Capture the item quickly, give it a real location, and add the details that make it findable later."
          />

          <div className="grid gap-4 md:grid-cols-4">
            {inventoryLoop.map((step, index) => (
              <LoopStep key={step.title} step={step} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <SectionHeader
            eyebrow="The everyday loop"
            title="The problem is not inventory. The problem is memory."
            description="WhereKeep is built around the moments that actually happen at home: something goes missing, something expires, something runs out, or someone needs to know what changed."
          />

          <div className="grid gap-4 md:grid-cols-3">
            {outcomes.map((outcome) => (
              <article
                key={outcome.title}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <FaCheck className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">{outcome.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{outcome.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
              The cost of not knowing
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              The app earns trust when it prevents the next duplicate purchase.
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
              The value is concrete: less time searching, fewer repeated
              purchases, cleaner restocking, fewer expired items, and fewer
              accidental edits in shared households.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <FaDollarSign className="h-4 w-4" />
              Built to pay for itself through avoided waste
            </div>
          </div>

          <div className="space-y-3">
            {spreadsheetComparison.map((row) => (
              <ComparisonRow key={row.oldWay} row={row} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <SectionHeader
            eyebrow="Shared homes need control"
            title="The solution has to work for everyone in the house."
            description="WhereKeep can fit a pantry, family storage setup, or small shared stockroom without giving every person full edit access."
          />

          <div className="grid gap-4 md:grid-cols-3">
            {audiences.map((audience) => (
              <AudienceCard key={audience.title} audience={audience} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <SectionHeader
            eyebrow="Problem solved"
            title="Each part of WhereKeep answers a moment of household friction."
            description="The app is not a pile of tools. It is one loop: put it away, find it, use it before it expires, restock it, and keep the household aligned."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {problemSolutions.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.problem}
                  className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stocksense-brand)]" />
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                    <Icon />
                  </div>
                  <div className="mb-2 inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    Problem
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{item.problem}</h3>
                  <div className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    WhereKeep
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{item.solution}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <SectionHeader
            eyebrow="How it starts"
            title="Start with one messy shelf, then let the system grow naturally."
            description="The first win should be simple: map a place, add a few things, and search before buying another duplicate."
          />

          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map((step, index) => (
              <article
                key={step.title}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--stocksense-brand)] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
              Family roles
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Invite people without handing over the whole system.
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
              A shared home memory is only valuable when the right people can help.
              Family roles let the owner choose who can change data and who can
              only view it.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta />
              <SecondaryCta />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Household access</div>
                <div className="text-xs text-gray-500">Owner controls who can edit</div>
              </div>
              <span className="rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                Family
              </span>
            </div>
            <div className="space-y-3">
              {roleRows.map((row) => (
                <div
                  key={row.role}
                  className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{row.role}</div>
                    <div className="mt-1 text-xs leading-5 text-gray-500">{row.detail}</div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${getPreviewToneClass(row.tone)}`}>
                    {row.role === 'Viewer' ? 'View only' : 'Can edit'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <SectionHeader
            eyebrow="Why upgrade"
            title="Upgrade when the problem gets bigger than one shelf."
            description="WhereKeep becomes most valuable when there are more items, more places, more people, and more restocking decisions to keep aligned."
          />

          <div className="grid gap-4 md:grid-cols-3">
            {upgradeReasons.map((reason) => {
              const Icon = reason.icon;

              return (
                <article
                  key={reason.title}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                    <Icon />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {reason.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {reason.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <SectionHeader
            eyebrow="Questions"
            title="Designed to solve the first problem before asking users to upgrade."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-xl border border-gray-200 bg-gray-50/70 p-5"
              >
                <h3 className="text-base font-semibold text-gray-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                  Start with one shelf. Grow into the whole household.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700">
                  Create a free account, map the first real spot, and upgrade
                  when unlimited items or shared access becomes the obvious next
                  step.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <PrimaryCta />
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--stocksense-brand)] shadow-sm transition hover:brightness-95"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

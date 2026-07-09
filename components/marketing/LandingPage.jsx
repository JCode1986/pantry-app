import Link from 'next/link';
import {
  FaArrowRight,
  FaChartLine,
  FaCheck,
  FaUsers,
  FaUserCheck,
} from 'react-icons/fa';
import {
  LuChevronDown,
  LuLayers3,
  LuMapPin,
  LuPackage,
  LuPlus,
  LuSearch,
  LuSearchCheck,
  LuUsers,
  LuWarehouse,
} from 'react-icons/lu';
import PricingSection from '@/components/marketing/PricingSection';
import ComparePlansButton from '@/components/marketing/ComparePlansButton';
import {
  FamilySharingVisual,
  ProblemExampleVisual,
  ProductScreenshotCard,
} from '@/components/marketing/AppMockup';
import PhoneMockup from '@/components/marketing/PhoneMockup';
import SiteFooter from '@/components/app-shell/SiteFooter';
import WhereKeepLogo from '@/components/ui/WhereKeepLogo';

const heroProofPoints = [
  'Stop buying duplicates',
  'Find items instantly',
  'Share with your household',
];

const outcomes = [
  {
    icon: LuSearch,
    title: 'Before: nobody remembers where it is',
    description:
      'Open drawers. Search bins. Buy another one because nobody remembers where the first one was stored.',
  },
  {
    icon: LuMapPin,
    title: 'With WhereKeep: everything has a place',
    description:
      'Save where each item lives, add important details, and let everyone find it when they need it.',
  },
  {
    icon: LuSearchCheck,
    title: 'Later: search instead of searching',
    description:
      'Find batteries, documents, tools, and supplies instantly without digging through drawers and bins.',
  },
  {
    icon: LuUsers,
    title: 'Together: everyone stays on the same page',
    description:
      'Shared households keep everyone organized whether they add, move, or use items.',
  },
];

const conversionStats = [
  {
    icon: LuPlus,
    value: 'Add',
    label: 'Quickly save items with photos, quantities, and expiration dates.',
  },
  {
    icon: LuPackage,
    value: 'Store',
    label: 'Organize by room, shelf, bin, or cabinet.',
  },
  {
    icon: LuSearch,
    value: 'Find',
    label: 'Search once and know exactly where it is.',
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

const hierarchyLevels = [
  {
    icon: LuMapPin,
    label: 'Location',
    example: 'Kitchen, Garage, Office',
    description: 'The main area where your items belong.',
    tone: 'brand',
  },
  {
    icon: LuWarehouse,
    label: 'Storage Area',
    example: 'Pantry, Closet, Storage Bin',
    description: 'The place inside your location where items are stored.',
    tone: 'success',
  },
  {
    icon: LuLayers3,
    label: 'Category',
    example: 'Snacks, Shelf 2, Tools',
    description: (
      <>
        Group items your way &mdash; by type, shelf, category, or collection.
      </>
    ),
    tone: 'warning',
  },
  {
    icon: LuPackage,
    label: 'Item',
    example: 'Pasta, Batteries, Passport',
    description: 'The things you actually need to find.',
    tone: 'muted',
  },
];

const hierarchyJourneys = [
  {
    item: 'Pasta',
    steps: [
      { label: 'Kitchen', icon: LuMapPin },
      { label: 'Pantry', icon: LuWarehouse },
      { label: 'Shelf 2', icon: LuLayers3 },
      { label: 'Pasta', icon: LuPackage },
    ],
  },
  {
    item: 'Batteries',
    steps: [
      { label: 'Garage', icon: LuMapPin },
      { label: 'Storage Bin', icon: LuWarehouse },
      { label: 'Tools', icon: LuLayers3 },
      { label: 'Batteries', icon: LuPackage },
    ],
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

function HeroStatStrip() {
  return (
    <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-3">
      {conversionStats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur"
          >
            <div className="flex items-center gap-2 text-lg font-semibold text-[var(--stocksense-brand)]">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)]">
                <Icon className="h-3.5 w-3.5" />
              </span>
              {stat.value}
            </div>
            <div className="mt-2 text-xs leading-5 text-gray-600">
              {stat.label}
            </div>
          </div>
        );
      })}
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

function HierarchyJourneyPath({ journey }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-gray-900">
            {journey.item}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
        {journey.steps.map((step, stepIndex) => {
          const Icon = step.icon;

          return (
            <div key={step.label} className="contents">
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-base font-semibold text-gray-900">
                  {step.label}
                </div>
              </div>
              {stepIndex < journey.steps.length - 1 && (
                <div className="grid place-items-center text-[var(--stocksense-brand)]">
                  <LuChevronDown className="h-5 w-5 md:rotate-[-90deg]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HierarchySection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeader
          eyebrow="The WhereKeep system"
          title="Organize your home the way you already think."
          description={
            <>
              WhereKeep mirrors real life &mdash; from rooms and shelves to bins
              and boxes, every item has a place.
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-4">
          {hierarchyLevels.map((level, index) => (
            <HierarchyLevelCard key={level.label} level={level} index={index} />
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--stocksense-brand-border)] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                Visual example
              </div>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">
                Find anything instantly
              </h3>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--stocksense-brand-border)] bg-white px-3 py-1 text-sm font-semibold text-[var(--stocksense-brand)] shadow-sm">
              <LuSearch className="h-3.5 w-3.5" />
              Found in seconds
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {hierarchyJourneys.map((journey) => (
              <HierarchyJourneyPath
                key={journey.item}
                journey={journey}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductPreviewSection() {
  return (
    <section className="border-y border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeader
          eyebrow="SEE WHEREKEEP IN ACTION"
          title="Your entire home, organized in one place."
          description="Track your items, search instantly, and always know where everything belongs."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <ProductScreenshotCard type="dashboard" />
          <ProductScreenshotCard type="search" />
          <ProductScreenshotCard type="addItem" />
        </div>
      </div>
    </section>
  );
}

function LifestyleProblemSection() {
  return (
    <section className="border-y border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeader
          eyebrow="BUILT FOR EVERYTHING YOU STORE"
          title="Pantry, garage, documents, and everything in between."
          description="WhereKeep gives every important household item a place, whether it lives on a shelf, in a bin, or inside a document box."
        />

        <ProblemExampleVisual />
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-[100vh] bg-white text-gray-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50 to-sky-50">
        <div className="absolute inset-x-0 top-0 h-32 bg-white/70" aria-hidden="true" />

        <div className="relative mx-auto flex max-w-6xl flex-col px-5 py-3">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <WhereKeepLogo className="drop-shadow-sm" markClassName="h-20 max-w-[350px]" />
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

          <div className="grid min-h-[calc(100svh-4rem)] gap-9 py-5 lg:grid-cols-[1fr_0.88fr] lg:items-center lg:gap-6 lg:py-7 xl:gap-8">
            <div className="max-w-2xl">
              <h1 className="text-[2rem] font-semibold leading-tight tracking-normal text-[var(--stocksense-brand)] min-[380px]:text-4xl sm:text-6xl sm:leading-none lg:text-7xl">
                <span className="block whitespace-nowrap">Stop buying things</span>
                <span className="block whitespace-nowrap">you already have.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-xl font-semibold leading-tight text-gray-900 sm:text-3xl">
                Find anything in your home in seconds.
              </p>
              <p className="mt-4 max-w-xl text-base leading-8 text-gray-700 sm:text-lg sm:leading-9">
                WhereKeep helps you organize every item by location, storage
                area, and category &mdash; so you always know exactly where
                things are.
              </p>

              <div className="mt-5 text-sm font-semibold text-[var(--stocksense-brand)]">
                Find it. Use it. Stop rebuying it.
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:brightness-95"
                >
                  Organize my home <FaArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  View features
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-sm font-medium text-gray-700">
                {heroProofPoints.map((point) => (
                  <span
                    key={point}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/85 px-3 py-1.5 shadow-sm"
                  >
                    <FaCheck className="h-3 w-3 text-[var(--stocksense-brand)]" />
                    {point}
                  </span>
                ))}
              </div>

              <HeroStatStrip />
            </div>

            <PhoneMockup className="lg:justify-self-start" />
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <SectionHeader
            eyebrow="The everyday problem"
            title={
              <>
                The problem isn&apos;t inventory.
                <span className="block">
                  The problem is remembering where things are.
                </span>
              </>
            }
            description="WhereKeep helps when things disappear, duplicates get bought, or nobody remembers where something was stored."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {outcomes.map((outcome) => {
              const Icon = outcome.icon;

              return (
                <article
                  key={outcome.title}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{outcome.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{outcome.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <LifestyleProblemSection />

      <HierarchySection />

      <ProductPreviewSection />

      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
              FAMILY SHARING
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Keep your whole household organized together.
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
              Invite your family and decide who can add, edit, or view items.
              Everyone can find what they need without asking where things are.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta />
              <ComparePlansButton className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50">
                View family plan
              </ComparePlansButton>
            </div>
          </div>

          <FamilySharingVisual />
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
                  Start with one shelf today. Grow into your whole household over time.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700">
                  Create a free account, map the first real spot, and build the
                  habit before expanding to more rooms, bins, and shared access.
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

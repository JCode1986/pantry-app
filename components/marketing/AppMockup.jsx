import {
  FaCheck,
  FaHome,
  FaPlus,
  FaSearch,
} from 'react-icons/fa';
import MarketingImage from '@/components/marketing/MarketingImage';

const mockups = {
  dashboard: {
    imageKey: 'dashboard',
    title: 'Dashboard',
    eyebrow: 'Home overview',
    icon: FaHome,
    description: 'See what you own, what needs attention, and what is running low.',
  },
  search: {
    imageKey: 'search',
    title: 'Search',
    eyebrow: 'Find anything',
    icon: FaSearch,
    description: 'Search "passport" and instantly see Bedroom Closet → Document Box.',
  },
  addItem: {
    imageKey: 'addItem',
    title: 'Add Item',
    eyebrow: 'Fast capture',
    icon: FaPlus,
    description: 'Add Pasta, quantity 2, and save it to Kitchen → Pantry → Shelf 2.',
  },
};

export function ProductScreenshotCard({ type }) {
  const mockup = mockups[type];
  const Icon = mockup.icon;

  return (
    <div className="group">
      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl">
        <MarketingImage
          imageKey={mockup.imageKey}
          alt={`${mockup.title} WhereKeep screenshot`}
          className="aspect-[4/3] rounded-none border-0 shadow-none"
          imageClassName="!object-contain bg-white"
          sizes="(min-width: 1024px) 33vw, 100vw"
        />
        <div className="flex items-start justify-between gap-3 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--stocksense-brand)]">
              {mockup.eyebrow}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">
              {mockup.title}
            </h3>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              {mockup.description}
            </p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </article>
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-50 hidden h-[80vh] w-[50vw] -translate-x-1/2 -translate-y-1/2 scale-95 opacity-0 transition duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 lg:block">
        <MarketingImage
          imageKey={mockup.imageKey}
          alt={`${mockup.title} enlarged WhereKeep screenshot`}
          className="h-full w-full rounded-2xl border border-gray-200 bg-white shadow-2xl"
          imageClassName="!object-contain bg-white"
          sizes="50vw"
        />
      </div>
    </div>
  );
}

export function LifestyleImageCard({ title, label, detail, imageKey = 'organizedHome' }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
      <MarketingImage
        imageKey={imageKey}
        alt={`${title} marketing image`}
        className="aspect-[3/2] rounded-none border-0 shadow-none"
        sizes="(min-width: 1024px) 33vw, 100vw"
      />
      <div className="p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--stocksense-brand)]">
          {label}
        </div>
        <h3 className="mt-1 text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-gray-600">{detail}</p>
      </div>
    </article>
  );
}

export function FamilySharingVisual() {
  const members = [
    ['Alex', 'Owner', 'Full access to everything'],
    ['Sarah', 'Editor', 'Can add and organize items'],
    ['Jason', 'Viewer', 'Can search and find items'],
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      <MarketingImage
        imageKey="family"
        alt="Household members sharing WhereKeep"
        className="aspect-[3/2] rounded-none border-0 shadow-none"
        imageClassName="!object-contain bg-white"
        sizes="(min-width: 1024px) 60vw, 100vw"
      />
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Household Members
            </div>
            <div className="text-xs text-gray-500">Shared access preview</div>
          </div>
          <span className="rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
            Family
          </span>
        </div>
        <div className="space-y-3">
          {members.map(([name, role, detail]) => (
            <div
              key={name}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/90 p-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {name} - {role}
                </div>
                <div className="mt-1 truncate text-xs text-gray-500">{detail}</div>
              </div>
              <FaCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProblemExampleVisual() {
  const examples = [
    {
      title: 'Pantry',
      label: 'Kitchen storage',
      detail: 'Find the exact shelf, basket, or container every time.',
      imageKey: 'pantry',
    },
    {
      title: 'Garage',
      label: 'Bins and shelves',
      detail: 'Find tools, batteries, and seasonal items without searching bins.',
      imageKey: 'garage',
    },
    {
      title: 'Records & Files',
      label: 'Important papers',
      detail: 'Passports, manuals, and records get a real home.',
      imageKey: 'documents',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {examples.map((example) => (
        <LifestyleImageCard key={example.title} {...example} />
      ))}
    </div>
  );
}

export function ProblemOutcomeCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
          Before WhereKeep
        </div>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">
          Storage turns into a guessing game.
        </h3>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          People open bins, rebuy things, and ask around because the house has no
          shared memory.
        </p>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          After WhereKeep
        </div>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">
          Search points to the exact place.
        </h3>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          Every item can show its room, shelf, bin, photo, quantity, and
          shopping status.
        </p>
      </div>
    </div>
  );
}

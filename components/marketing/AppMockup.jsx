import {
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
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
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
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl lg:scale-[1.02]">
      <MarketingImage
        imageKey="family"
        alt="Household members sharing WhereKeep"
        className="aspect-[3/2] rounded-none border-0 shadow-none"
        imageClassName="!object-contain bg-white"
        sizes="(min-width: 1024px) 60vw, 100vw"
      />
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

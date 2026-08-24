import Link from "next/link";
import {
  FaArrowRight,
  FaCheck,
  FaHome,
  FaSearch,
} from "react-icons/fa";
import {
  LuCalendarClock,
  LuCircleCheck,
  LuClipboardCheck,
  LuFlag,
  LuLayers3,
  LuListChecks,
  LuMapPin,
  LuPackage,
  LuPackageCheck,
  LuRepeat2,
  LuShoppingCart,
  LuWarehouse,
} from "react-icons/lu";
import SiteFooter from "@/components/app-shell/SiteFooter";
import {
  FamilySharingVisual,
  ProductScreenshotCard,
} from "@/components/marketing/AppMockup";
import MarketingImage from "@/components/marketing/MarketingImage";
import WhereKeepLogo from "@/components/ui/WhereKeepLogo";
import { createPageMetadata, siteConfig } from "@/utils/metadata";

const pageTitle = "Home Inventory App & Household Inventory Tracker";
const pageDescription =
  "Organize what you own and know exactly where everything is stored. WhereKeep helps you track household items, storage locations, quantities, expiration dates, shopping lists, and more.";

export const metadata = createPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/home-inventory-app",
  twitterCard: "summary_large_image",
});

const benefits = [
  "Create a searchable record of household items",
  "Organize belongings by location and storage area",
  "Track quantities, expiration dates, notes, and photos",
  "Share the same inventory with household members",
];

const practicalUses = [
  "Remember what you already own before you buy another one",
  "Find where something is stored without searching the whole house",
  "Keep quantities current for food, supplies, tools, and essentials",
  "Track expiration dates so pantry items and household goods do not get forgotten",
  "Coordinate shopping lists, chores, and shared access with the people at home",
];

const detailFeatures = [
  {
    icon: LuPackage,
    title: "Quantity",
    description: "Track how many you have, whether it is pasta, batteries, filters, or supplies.",
  },
  {
    icon: LuLayers3,
    title: "Category",
    description: "Group items by type so your inventory stays easy to scan.",
  },
  {
    icon: LuMapPin,
    title: "Storage location",
    description: "Save the exact room, shelf, bin, or cabinet where each item belongs.",
  },
  {
    icon: LuCalendarClock,
    title: "Expiration date",
    description: "Know what needs to be used, replaced, or restocked soon.",
  },
  {
    icon: LuClipboardCheck,
    title: "Notes",
    description: "Keep useful details with the item instead of relying on memory.",
  },
  {
    icon: LuPackageCheck,
    title: "Photos",
    description: "Add images so stored items and containers are easier to recognize.",
  },
];

const useCases = [
  {
    title: "Pantry",
    description: "Track food, quantities, and expiration dates.",
  },
  {
    title: "Garage",
    description: "Remember which shelf, cabinet, or bin holds an item.",
  },
  {
    title: "Closets",
    description: "Keep seasonal items and stored belongings organized.",
  },
  {
    title: "Kitchen",
    description: "Track supplies and avoid unnecessary duplicates.",
  },
  {
    title: "Storage",
    description: "Know what is inside boxes and storage areas without opening everything.",
  },
  {
    title: "Household",
    description: "Give members one shared source of truth.",
  },
];

const spreadsheetComparison = [
  {
    title: "A spreadsheet",
    points: [
      "Requires you to maintain the structure",
      "Gets harder to navigate on a phone",
      "Does not naturally connect rooms, storage areas, and items",
      "Needs manual formatting to track dates, quantities, and responsibilities",
    ],
  },
  {
    title: "WhereKeep",
    points: [
      "Uses purpose-built locations, storage areas, categories, and items",
      "Keeps household inventory searchable from one place",
      "Tracks quantities and expiration dates",
      "Adds shared household access, shopping lists, tasks, and chores",
    ],
  },
];

const faqs = [
  {
    question: "What is a home inventory app?",
    answer:
      "A home inventory app helps you keep a searchable record of the things in your home, including where they are stored and useful details like quantity or expiration date.",
  },
  {
    question: "What should I track in a home inventory?",
    answer:
      "Start with anything you forget, rebuy, store away, or need to keep organized: pantry items, household supplies, tools, documents, seasonal items, and storage bins.",
  },
  {
    question: "Can I organize items by room or storage location?",
    answer:
      "Yes. WhereKeep lets you organize items by location, storage area, category, and item so you can model the way your home is actually arranged.",
  },
  {
    question: "Can my household share the same inventory?",
    answer:
      "Yes. Household members can share access, and roles help control who can manage inventory and who can view it.",
  },
  {
    question: "Can WhereKeep track expiration dates?",
    answer:
      "Yes. Items can include expiration dates, which makes WhereKeep useful for pantry inventory and other consumable household supplies.",
  },
  {
    question: "Can I use WhereKeep for pantry inventory?",
    answer:
      "Yes. You can track pantry items, quantities, storage locations, and expiration dates, then use shopping lists to keep restocking organized.",
  },
  {
    question: "Does WhereKeep include household tasks and chores?",
    answer:
      "Yes. WhereKeep supports household tasks, assigned chores, due dates, priorities, and recurring chores.",
  },
];

const taskRows = [
  {
    title: "Replace HVAC air filter",
    location: "Hallway Closet",
    assignee: "Joseph",
    priority: "High",
    due: "Aug 25",
    recurring: true,
  },
  {
    title: "Organize the pantry",
    location: "Pantry",
    assignee: "Leah",
    priority: "Medium",
    due: "Aug 30",
  },
  {
    title: "Water the plants",
    location: "Living Room",
    assignee: "Ava",
    priority: "Low",
    due: "Today",
  },
];

function HomeInventoryStructuredData() {
  const pageUrl = new URL("/home-inventory-app", siteConfig.url).toString();
  const imageUrl = new URL("/wherekeep-social-preview.jpg", siteConfig.url).toString();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        name: `${pageTitle} | ${siteConfig.name}`,
        url: pageUrl,
        description: pageDescription,
        isPartOf: {
          "@id": `${siteConfig.url}/#website`,
        },
        about: {
          "@id": `${siteConfig.url}/#webapplication`,
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${siteConfig.url}/#webapplication`,
        name: siteConfig.name,
        url: siteConfig.url,
        image: imageUrl,
        description:
          "WhereKeep is a home inventory app for tracking household items, storage locations, quantities, expiration dates, shopping lists, tasks, and chores.",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        inLanguage: "en-US",
        featureList: [
          "Household inventory tracking",
          "Locations and storage areas",
          "Quantity tracking",
          "Expiration tracking",
          "Shared household access",
          "Shopping lists",
          "Tasks and chores",
          "Recurring chores",
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function PrimaryCta({ children = "Get Started Free", className = "" }) {
  return (
    <Link
      href="/signup"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-6 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 ${className}`}
    >
      {children} <FaArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

function SecondaryCta({ className = "" }) {
  return (
    <Link
      href="#how-it-works"
      className={`inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 ${className}`}
    >
      See How It Works
    </Link>
  );
}

function MarketingHeader() {
  return (
    <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
      <Link href="/" className="-ml-5 flex min-w-0 items-center gap-3 sm:ml-0" aria-label="WhereKeep home">
        <WhereKeepLogo
          className="drop-shadow-sm"
          markClassName="h-16 max-w-[240px] sm:h-20 sm:max-w-[350px]"
        />
      </Link>
      <nav aria-label="Landing page navigation" className="flex shrink-0 items-center gap-2">
        <Link
          href="/#pricing"
          className="hidden rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 sm:inline-flex"
        >
          Pricing
        </Link>
        <Link
          href="/login"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[var(--stocksense-brand-border)] bg-white/90 px-4 text-sm font-semibold text-[var(--stocksense-brand)] shadow-sm transition hover:bg-white"
        >
          Log in
        </Link>
        <PrimaryCta className="hidden min-h-10 px-4 sm:inline-flex">
          Start free
        </PrimaryCta>
      </nav>
    </header>
  );
}

function SectionHeader({ eyebrow, title, description, align = "center" }) {
  return (
    <div className={align === "left" ? "mb-8 max-w-2xl" : "mx-auto mb-8 max-w-3xl text-center"}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function CheckList({ items }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-gray-700">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
            <FaCheck className="h-2.5 w-2.5" aria-hidden="true" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function HeroInventoryPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl min-w-0">
      <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 p-2 shadow-[0_28px_80px_rgba(14,116,136,0.16)] backdrop-blur sm:p-4">
        <MarketingImage
          imageKey="dashboard"
          alt="WhereKeep home inventory dashboard showing household items and storage locations"
          priority
          className="aspect-[4/3] rounded-[1.5rem] border-gray-200 shadow-none"
          imageClassName="!object-contain bg-white"
          sizes="(min-width: 1024px) 520px, 92vw"
        />
      </div>
      <div className="mx-auto mt-4 grid max-w-md grid-cols-3 gap-2 text-center text-xs font-semibold text-gray-700 sm:absolute sm:-bottom-5 sm:left-6 sm:right-6 sm:mt-0">
        {["Kitchen", "Garage", "Pantry"].map((label) => (
          <span
            key={label}
            className="rounded-xl border border-gray-200 bg-white/95 px-2 py-2 shadow-sm"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function LocationFlowPreview() {
  const steps = [
    { label: "Home", detail: "Main household", icon: FaHome },
    { label: "Garage", detail: "Location", icon: LuMapPin },
    { label: "Storage Shelf", detail: "Storage area", icon: LuWarehouse },
    { label: "Camping Gear", detail: "Item", icon: LuPackage },
  ];

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Location path
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Know exactly where it is stored
          </h3>
        </div>
        <LuMapPin className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-3">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div key={step.label} className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="truncate text-sm font-semibold text-gray-950">{step.label}</p>
                <p className="text-xs text-gray-500">{step.detail}</p>
              </div>
              {index < steps.length - 1 ? (
                <span className="text-xs font-bold text-[var(--stocksense-brand)]" aria-hidden="true">
                  {">"}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SearchPreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900">
          <FaSearch className="h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
          <span>batteries</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {[
          ["AA batteries", "Garage / Storage Bin / Tools", "Qty 8"],
          ["Button batteries", "Office / Desk Drawer / Electronics", "Qty 3"],
          ["Flashlight", "Hall Closet / Emergency Kit", "Qty 1"],
        ].map(([title, path, quantity]) => (
          <div key={title} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-950">{title}</p>
                <p className="mt-1 truncate text-xs text-gray-500">{path}</p>
              </div>
              <span className="shrink-0 rounded-lg bg-[var(--stocksense-brand-soft)] px-2 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                {quantity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailsPreview() {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
      <MarketingImage
        imageKey="addItem"
        alt="WhereKeep inventory item form showing quantity, expiration date, and storage location"
        className="aspect-[4/3] rounded-none border-0 shadow-none"
        imageClassName="!object-contain bg-white"
        sizes="(min-width: 1024px) 48vw, 100vw"
      />
      <div className="grid gap-3 border-t border-gray-100 p-4 sm:grid-cols-3">
        {["Quantity", "Expiration", "Location"].map((label) => (
          <div key={label} className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              Saved with item
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShoppingListPreview() {
  const rows = [
    ["Coffee filters", "Needed", "2"],
    ["Dish soap", "Needed", "1"],
    ["Pasta", "Purchased", "3"],
  ];

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Shopping list
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Restock what matters
          </h3>
        </div>
        <LuShoppingCart className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-2.5">
        {rows.map(([title, status, quantity]) => (
          <div key={title} className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${status === "Purchased" ? "border-[var(--stocksense-brand)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]" : "border-gray-300 bg-white text-transparent"}`}>
              <LuCircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
              {title}
            </span>
            <span className="shrink-0 text-xs font-semibold text-gray-500">
              Qty {quantity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskPriority({ priority }) {
  const tone =
    priority === "High"
      ? "text-rose-700 bg-rose-50 border-rose-200"
      : priority === "Low"
        ? "text-slate-600 bg-slate-50 border-slate-200"
        : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold ${tone}`}>
      <LuFlag className="h-3 w-3" aria-hidden="true" />
      {priority}
    </span>
  );
}

function TasksPreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Tasks & chores
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Due dates stay visible
          </h3>
        </div>
        <LuListChecks className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-2.5">
        {taskRows.map((task) => (
          <div key={task.title} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-gray-300 bg-white" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-950">{task.title}</p>
                  {task.recurring ? (
                    <LuRepeat2 className="h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)]" aria-label="Recurring chore" />
                  ) : null}
                </div>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {task.location} / {task.assignee} / {task.due}
                </p>
              </div>
              <TaskPriority priority={task.priority} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TwoColumnSection({
  id,
  eyebrow,
  title,
  description,
  children,
  visual,
  reverse = false,
  tone = "white",
}) {
  return (
    <section id={id} className={`border-y border-gray-200 ${tone === "soft" ? "bg-gray-50" : "bg-white"}`}>
      <div className={`mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-2 lg:items-center ${reverse ? "lg:[&>div:first-child]:order-2" : ""}`}>
        <div className="min-w-0">
          <SectionHeader
            align="left"
            eyebrow={eyebrow}
            title={title}
            description={description}
          />
          {children}
        </div>
        <div className="min-w-0">{visual}</div>
      </div>
    </section>
  );
}

export default function HomeInventoryAppPage() {
  return (
    <>
      <HomeInventoryStructuredData />
      <main className="min-h-[100vh] overflow-hidden bg-white text-gray-900">
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50 to-sky-50">
          <div className="absolute inset-x-0 top-0 h-32 bg-white/70" aria-hidden="true" />
          <MarketingHeader />
          <div className="relative mx-auto grid max-w-6xl gap-9 px-5 pb-16 pt-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-20 lg:pt-8">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                Home inventory app
              </p>
              <h1 className="text-[2.35rem] font-semibold leading-tight tracking-normal text-[var(--stocksense-brand)] min-[380px]:text-5xl sm:text-6xl lg:text-7xl">
                <span className="block">Know what you have.</span>
                <span className="block">Know exactly where it is.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-gray-700 sm:text-lg sm:leading-9">
                WhereKeep is a home inventory app that gives your household one
                organized place to track what you own, where it is stored, what
                needs restocking, and what needs your attention.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <PrimaryCta />
                <SecondaryCta />
              </div>
              <div className="mt-7 grid gap-2 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/85 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    <FaCheck className="h-3 w-3 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <HeroInventoryPreview />
          </div>
        </section>

        <section className="bg-white" id="how-it-works">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div className="min-w-0">
                <SectionHeader
                  align="left"
                  eyebrow="Inventory basics"
                  title="What is a home inventory app?"
                  description="A home inventory app helps you create a searchable record of household belongings and organize them by the places they live."
                />
                <div className="space-y-4 text-sm leading-7 text-gray-700 sm:text-base">
                  <p>
                    Instead of relying on memory, photos, labels, or a spreadsheet,
                    your household can see what you already own, where it is stored,
                    and what needs attention next.
                  </p>
                  <p>
                    WhereKeep turns that record into a practical household inventory
                    tracker for everyday use: finding supplies, reducing duplicate
                    purchases, managing quantities, and keeping everyone organized.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {practicalUses.map((use) => (
                  <article key={use} className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                    <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                      <FaCheck className="h-3 w-3" aria-hidden="true" />
                    </div>
                    <p className="text-sm leading-6 text-gray-700">{use}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <TwoColumnSection
          eyebrow="Organize by location"
          title="Build your inventory around where things actually live."
          description="WhereKeep uses the same structure your home already has: locations, storage areas, categories, and items."
          visual={<LocationFlowPreview />}
          tone="soft"
        >
          <div className="rounded-2xl border border-[var(--stocksense-brand-border)] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900">
              Example path
            </p>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Home {"->"} Garage {"->"} Storage Shelf {"->"} Camping Gear
            </p>
            <p className="mt-3 text-sm leading-7 text-gray-700">
              That structure keeps your inventory useful after you add more
              rooms, shelves, bins, cabinets, and stored belongings.
            </p>
          </div>
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Fast search"
          title="Find anything without searching the whole house."
          description="Search your household inventory and see where an item is stored, including the location path and useful details."
          visual={<SearchPreview />}
          reverse
        >
          <CheckList
            items={[
              "Search for the item name you remember",
              "See where it belongs before opening boxes or drawers",
              "Reduce duplicate purchases caused by lost supplies",
            ]}
          />
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Item details"
          title="Keep the details that actually matter."
          description="Inventory entries can hold the practical information you need later, not just the item name."
          visual={<DetailsPreview />}
          tone="soft"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {detailFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <article key={feature.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-950">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </TwoColumnSection>

        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="Product preview"
              title="A household inventory tracker for the things you actually store."
              description="Use WhereKeep for everyday supplies, stored documents, garage bins, pantry staples, and the items that get misplaced most often."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <ProductScreenshotCard type="dashboard" />
              <ProductScreenshotCard type="search" />
              <ProductScreenshotCard type="addItem" />
            </div>
          </div>
        </section>

        <TwoColumnSection
          eyebrow="Pantry and supplies"
          title="Know what is running low or expiring soon."
          description="WhereKeep is useful for pantry inventory and other consumables because each item can include quantities, expiration dates, and storage details."
          visual={
            <MarketingImage
              imageKey="pantry"
              alt="Organized pantry storage for WhereKeep pantry inventory tracking"
              className="aspect-[4/3] rounded-3xl border-gray-200 shadow-xl"
              sizes="(min-width: 1024px) 48vw, 100vw"
            />
          }
        >
          <CheckList
            items={[
              "Track food and household supplies by quantity",
              "Save expiration dates so forgotten items are easier to catch",
              "Check what you have before you buy more",
            ]}
          />
          <p className="mt-4 text-sm leading-7 text-gray-700 sm:text-base">
            For a deeper pantry-specific workflow, see how WhereKeep works as a{" "}
            <Link
              href="/pantry-inventory-app"
              className="font-semibold text-[var(--stocksense-brand)] hover:brightness-90"
            >
              pantry inventory app
            </Link>
            .
          </p>
        </TwoColumnSection>

        <section className="border-y border-[var(--stocksense-brand-border)] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <div className="grid gap-8 rounded-3xl bg-[var(--stocksense-brand-soft)]/70 p-5 shadow-[0_24px_70px_rgba(14,116,136,0.08)] sm:p-7 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:p-8">
              <div className="min-w-0">
                <SectionHeader
                  align="left"
                  eyebrow="Household sharing"
                  title="One inventory for the whole household."
                  description={
                    <>
                      Invite household members so everyone can find what they
                      need. Owners, editors, and viewers keep access aligned
                      with each person&apos;s role. Learn more about{" "}
                      <Link
                        href="/shared-household-inventory"
                        className="font-semibold text-[var(--stocksense-brand)] hover:brightness-90"
                      >
                        sharing one household inventory
                      </Link>
                      .
                    </>
                  }
                />
                <CheckList
                  items={[
                    "Owners manage household access",
                    "Editors help add and organize inventory",
                    "Viewers can search shared inventory without managing details",
                  ]}
                />
              </div>
              <FamilySharingVisual />
            </div>
          </div>
        </section>

        <TwoColumnSection
          eyebrow="Shopping lists"
          title="Know what you have before you buy more."
          description="Keep restocking decisions closer to your household inventory with shared shopping lists for the supplies you need."
          visual={<ShoppingListPreview />}
          tone="soft"
        >
          <p className="text-sm leading-7 text-gray-700 sm:text-base">
            WhereKeep keeps shopping organized without pretending every purchase
            should be automatic. Add what you need, track quantities, and check your
            inventory before another duplicate comes home.
          </p>
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Tasks and chores"
          title="Inventory and household tasks in one place."
          description="Some household organization is about what you own. Some of it is about what needs to get done."
          visual={<TasksPreview />}
        >
          <CheckList
            items={[
              "Create household tasks and chores",
              "Assign tasks to members",
              "Set due dates and priorities",
              "Use recurring chores for repeat responsibilities",
            ]}
          />
        </TwoColumnSection>

        <section className="border-y border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="Use cases"
              title="WhereKeep works around the whole home."
              description="Start with one area or organize every place your household stores things."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((useCase) => (
                <article key={useCase.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-950">{useCase.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{useCase.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="Spreadsheet alternative"
              title="A home inventory should be easier than a spreadsheet."
              description="Spreadsheets can work for a small list, but a shared household inventory needs structure that stays useful on real devices."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {spreadsheetComparison.map((group) => (
                <article key={group.title} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
                  <h3 className="text-lg font-semibold text-gray-950">{group.title}</h3>
                  <ul className="mt-4 grid gap-3">
                    {group.points.map((point) => (
                      <li key={point} className="flex gap-2 text-sm leading-6 text-gray-700">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[var(--stocksense-brand)] shadow-sm">
                          <FaCheck className="h-2.5 w-2.5" aria-hidden="true" />
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="FAQ"
              title="Home inventory app questions."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {faqs.map((faq) => (
                <article key={faq.question} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-950">{faq.question}</h3>
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
                  <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                    Stop wondering where you put it.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-800">
                    Build a home inventory your household can actually keep organized.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-[var(--stocksense-brand)]">
                    <Link href="/" className="hover:brightness-90">
                      Visit the homepage
                    </Link>
                    <Link href="/#pricing" className="hover:brightness-90">
                      View pricing
                    </Link>
                    <Link href="/support" className="hover:brightness-90">
                      Get support
                    </Link>
                  </div>
                </div>
                <PrimaryCta className="lg:shrink-0" />
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}

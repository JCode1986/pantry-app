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
  LuLayers3,
  LuMapPin,
  LuPackage,
  LuPackageCheck,
  LuShoppingCart,
  LuUsers,
  LuWarehouse,
} from "react-icons/lu";
import SiteFooter from "@/components/app-shell/SiteFooter";
import MarketingImage from "@/components/marketing/MarketingImage";
import WhereKeepLogo from "@/components/ui/WhereKeepLogo";
import { createPageMetadata, siteConfig } from "@/utils/metadata";

const pageTitle = "Pantry Inventory App for Expiration Dates & Restocking";
const pageDescription =
  "Keep track of what's in your pantry, where it's stored, what's running low, and what expires soon. WhereKeep makes pantry inventory and restocking easier.";

export const metadata = createPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/pantry-inventory-app",
  twitterCard: "summary_large_image",
});

const heroBenefits = [
  "Track pantry items and quantities",
  "Save expiration dates",
  "See low-stock supplies",
  "Keep shopping lists close by",
];

const pantryProblems = [
  {
    title: "Duplicate purchases",
    description: "Three open boxes of pasta happen when nobody checks what is already on the shelf.",
  },
  {
    title: "Forgotten ingredients",
    description: "Ingredients disappear behind bins, cans, bags, and extra kitchen storage.",
  },
  {
    title: "Expired food",
    description: "Expiration dates are easy to miss when food is spread across shelves, cabinets, and the fridge.",
  },
  {
    title: "Surprise shortages",
    description: "Staples run out faster when nobody knows the current quantity.",
  },
  {
    title: "Shared shopping confusion",
    description: "Multiple household members can buy the same thing when there is no shared source of truth.",
  },
  {
    title: "Scattered storage",
    description: "Pantry food, refrigerator items, freezer goods, and backup supplies rarely live in one place.",
  },
];

const pantryPaths = [
  ["Pasta", "Kitchen", "Pantry", "Shelf 2"],
  ["Rice", "Kitchen", "Pantry", "Lower Shelf"],
  ["Canned tomatoes", "Kitchen", "Pantry", "Top Shelf"],
  ["Paper towels", "Kitchen Storage", "Cabinet", "Backstock"],
];

const pantryItems = [
  {
    name: "Pasta",
    quantity: 3,
    location: "Pantry / Shelf 2",
    status: "In stock",
  },
  {
    name: "Canned tomatoes",
    quantity: 6,
    location: "Pantry / Top Shelf",
    status: "In stock",
  },
  {
    name: "Rice",
    quantity: 1,
    location: "Pantry / Lower Shelf",
    status: "Low stock",
  },
  {
    name: "Coffee filters",
    quantity: 0,
    location: "Kitchen Cabinet",
    status: "Restock",
  },
];

const expirationItems = [
  {
    name: "Milk",
    detail: "Expires in 2 days",
    tone: "warning",
  },
  {
    name: "Pasta sauce",
    detail: "Expires Aug 30",
    tone: "warning",
  },
  {
    name: "Canned beans",
    detail: "Good until 2027",
    tone: "success",
  },
  {
    name: "Yogurt",
    detail: "Expired",
    tone: "danger",
  },
];

const restockItems = [
  ["Rice", "Qty 1", "Low stock"],
  ["Olive oil", "Qty 1", "Low stock"],
  ["Coffee filters", "Qty 0", "Restock"],
  ["Dish soap", "Qty 0", "Restock"],
];

const shoppingItems = [
  ["Coffee filters", "Needed", "1"],
  ["Rice", "Needed", "2"],
  ["Pasta sauce", "Needed", "2"],
  ["Canned beans", "Purchased", "4"],
];

const beyondPantry = [
  {
    title: "Refrigerator",
    description: "Track short-life foods and where they are stored.",
  },
  {
    title: "Freezer",
    description: "Keep frozen items from getting forgotten behind other food.",
  },
  {
    title: "Kitchen cabinets",
    description: "Save backup spices, coffee filters, paper goods, and supplies.",
  },
  {
    title: "Pantry",
    description: "Organize shelves, bins, baskets, and everyday staples.",
  },
  {
    title: "Garage food storage",
    description: "Track overflow supplies and bulk purchases stored outside the kitchen.",
  },
  {
    title: "Household supplies",
    description: "Use the same system for cleaning products, paper goods, and backstock.",
  },
];

const steps = [
  {
    title: "Add what you have",
    description: "Create pantry item records with names, quantities, expiration dates, notes, and photos when useful.",
  },
  {
    title: "Tell WhereKeep where it lives",
    description: "Choose the location and storage area so each item has a real place in your household inventory.",
  },
  {
    title: "Check before you shop",
    description: "Review quantities, expiring items, low-stock supplies, and your shopping list before another grocery run.",
  },
];

const useCases = [
  {
    title: "Weekly groceries",
    description: "Check the pantry before shopping so staples do not get bought twice.",
  },
  {
    title: "Bulk shopping",
    description: "Keep track of extras from warehouse stores without forgetting what is in backstock.",
  },
  {
    title: "Meal planning",
    description: "See whether common ingredients are available before planning meals or writing a grocery list.",
  },
  {
    title: "Food waste awareness",
    description: "Use expiration information to spot food that should be used soon.",
  },
];

const comparison = [
  {
    title: "A handwritten list",
    points: [
      "Requires manual organization",
      "Becomes stale as soon as someone uses or buys something",
      "Does not naturally model shelves, cabinets, or storage areas",
      "Can be awkward to update while shopping",
    ],
  },
  {
    title: "WhereKeep",
    points: [
      "Keeps purpose-built item records",
      "Stores quantities and expiration dates",
      "Connects food to locations and storage areas",
      "Supports low-stock views, shopping lists, and household access",
    ],
  },
];

const faqs = [
  {
    question: "What is a pantry inventory app?",
    answer:
      "A pantry inventory app helps you track the food and household supplies you already have, including quantities, storage locations, and expiration dates.",
  },
  {
    question: "How do I keep track of what's in my pantry?",
    answer:
      "Add pantry items to WhereKeep, save where each item is stored, and update the quantity as items are used or restocked.",
  },
  {
    question: "Can WhereKeep track expiration dates?",
    answer:
      "Yes. Inventory items can include expiration dates, and WhereKeep can show expired or expiring-soon items in the app.",
  },
  {
    question: "Can I track quantities of pantry items?",
    answer:
      "Yes. Items have quantity fields, which can help you see what is stocked, low, or empty.",
  },
  {
    question: "Can I organize food by shelf or storage area?",
    answer:
      "Yes. WhereKeep supports locations, storage areas, categories, and items, so pantry food can be organized by the places it actually lives.",
  },
  {
    question: "Can my household share the same pantry inventory?",
    answer:
      "Yes. Household members can share access, and owner, editor, and viewer roles help control what each person can do.",
  },
  {
    question: "Can I use WhereKeep for my refrigerator and freezer too?",
    answer:
      "Yes. Refrigerator and freezer spaces can be represented as locations or storage areas, depending on how your household organizes food.",
  },
];

function PantryStructuredData() {
  const pageUrl = new URL("/pantry-inventory-app", siteConfig.url).toString();
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
          "WhereKeep is a household inventory app for tracking pantry items, quantities, storage locations, expiration dates, shopping lists, tasks, and chores.",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        inLanguage: "en-US",
        featureList: [
          "Pantry inventory tracking",
          "Kitchen storage locations",
          "Quantity tracking",
          "Expiration date tracking",
          "Low-stock item views",
          "Shopping lists",
          "Shared household access",
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
      <Link
        href="/"
        className="-ml-5 flex min-w-0 items-center gap-3 sm:ml-0"
        aria-label="WhereKeep home"
      >
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

function PantryStatusBadge({ status }) {
  const tone =
    status === "Restock"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status === "Low stock"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]";

  return (
    <span className={`inline-flex shrink-0 rounded-lg border px-2 py-1 text-[11px] font-semibold ${tone}`}>
      {status}
    </span>
  );
}

function PantryItemRow({ item }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-950">{item.name}</p>
          <p className="mt-1 truncate text-xs text-gray-500">{item.location}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-lg bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700">
            Qty {item.quantity}
          </span>
          <PantryStatusBadge status={item.status} />
        </div>
      </div>
    </div>
  );
}

function HeroPantryPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl min-w-0">
      <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 p-2 shadow-[0_28px_80px_rgba(14,116,136,0.16)] backdrop-blur sm:p-4">
        <MarketingImage
          imageKey="pantry"
          alt="WhereKeep pantry inventory showing food quantities and expiration dates"
          priority
          className="aspect-[4/3] rounded-[1.5rem] border-gray-200 shadow-none"
          sizes="(min-width: 1024px) 520px, 92vw"
        />
      </div>
      <div className="mx-auto mt-4 max-w-md rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-sm sm:absolute sm:-bottom-7 sm:left-6 sm:right-6 sm:mt-0">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--stocksense-brand)]">
            Pantry snapshot
          </span>
          <span className="text-xs font-semibold text-amber-700">2 low</span>
        </div>
        <div className="grid gap-2">
          {pantryItems.slice(0, 3).map((item) => (
            <PantryItemRow key={item.name} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PantryPathPreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Storage paths
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Food has a place
          </h3>
        </div>
        <LuMapPin className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-3">
        {pantryPaths.map(([item, location, area, shelf]) => (
          <div key={item} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
            <p className="truncate text-sm font-semibold text-gray-950">{item}</p>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-gray-600">
              {[location, area, shelf].map((part, index) => (
                <span key={`${item}-${part}`} className="contents">
                  <span className="min-w-0 truncate rounded-lg bg-white px-2 py-1 shadow-sm">
                    {part}
                  </span>
                  {index < 2 ? (
                    <span className="text-[var(--stocksense-brand)]" aria-hidden="true">
                      {">"}
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuantityPreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Quantities
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Pantry counts at a glance
          </h3>
        </div>
        <LuPackage className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-2.5">
        {pantryItems.map((item) => (
          <PantryItemRow key={item.name} item={item} />
        ))}
      </div>
    </div>
  );
}

function ExpirationBadge({ tone, children }) {
  const className =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`inline-flex rounded-lg border px-2 py-1 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function ExpirationPreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Expiration dates
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Use it before it gets forgotten
          </h3>
        </div>
        <LuCalendarClock className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-2.5">
        {expirationItems.map((item) => (
          <div key={item.name} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
            <span className="min-w-0 truncate text-sm font-semibold text-gray-950">
              {item.name}
            </span>
            <ExpirationBadge tone={item.tone}>{item.detail}</ExpirationBadge>
          </div>
        ))}
      </div>
    </div>
  );
}

function RestockPreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Low stock
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Supplies that need attention
          </h3>
        </div>
        <LuPackageCheck className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-2.5">
        {restockItems.map(([name, quantity, status]) => (
          <div key={name} className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[var(--stocksense-brand)] shadow-sm">
              <LuPackage className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-950">
              {name}
            </span>
            <span className="shrink-0 text-xs font-semibold text-gray-500">
              {quantity}
            </span>
            <PantryStatusBadge status={status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ShoppingListPreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Shopping list
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Restock without guessing
          </h3>
        </div>
        <LuShoppingCart className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-2.5">
        {shoppingItems.map(([name, status, quantity]) => (
          <div key={name} className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${status === "Purchased" ? "border-[var(--stocksense-brand)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]" : "border-gray-300 bg-white text-transparent"}`}>
              <LuCircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
              {name}
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

function SharingPreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Shared household
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Everyone checks the same pantry
          </h3>
        </div>
        <LuUsers className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-3">
        {[
          ["Owner", "Manages household access"],
          ["Editor", "Adds and organizes inventory"],
          ["Viewer", "Searches and checks what is stored"],
        ].map(([role, detail]) => (
          <div key={role} className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-xs font-bold text-[var(--stocksense-brand)]">
              {role.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-950">{role}</p>
              <p className="truncate text-xs text-gray-500">{detail}</p>
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

export default function PantryInventoryAppPage() {
  return (
    <>
      <PantryStructuredData />
      <main className="min-h-[100vh] overflow-hidden bg-white text-gray-900">
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50 to-sky-50">
          <div className="absolute inset-x-0 top-0 h-32 bg-white/70" aria-hidden="true" />
          <MarketingHeader />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-24 lg:pt-8">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                Pantry inventory app
              </p>
              <h1 className="text-[2.25rem] font-semibold leading-tight tracking-normal text-[var(--stocksense-brand)] min-[380px]:text-5xl sm:text-6xl lg:text-7xl">
                Know what&apos;s in your pantry before you buy more.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-gray-700 sm:text-lg sm:leading-9">
                Track pantry items, quantities, storage locations, and expiration
                dates so your household knows what you have and what needs
                restocking.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <PrimaryCta />
                <SecondaryCta />
              </div>
              <div className="mt-7 grid gap-2 sm:grid-cols-2">
                {heroBenefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/85 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    <FaCheck className="h-3 w-3 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <HeroPantryPreview />
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="The pantry problem"
              title="Stop finding three of something you forgot you had."
              description="Pantry organization breaks down when food is spread across shelves, cabinets, refrigerator space, freezer storage, and overflow areas."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pantryProblems.map((problem) => (
                <article key={problem.title} className="rounded-xl border border-gray-200 bg-gray-50/80 p-5">
                  <div className="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                    <LuPackage className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-950">{problem.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{problem.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <TwoColumnSection
          eyebrow="Pantry organization"
          title="Know not only what you own, but where it is stored."
          description="WhereKeep uses locations, storage areas, categories, and items so your pantry inventory can match the real layout of your kitchen."
          visual={<PantryPathPreview />}
          tone="soft"
        >
          <div className="rounded-2xl border border-[var(--stocksense-brand-border)] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900">Example path</p>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Home {"->"} Kitchen {"->"} Pantry {"->"} Top Shelf
            </p>
            <p className="mt-3 text-sm leading-7 text-gray-700">
              That makes it easier to find ingredients, backstock, and household
              supplies without opening every cabinet.
            </p>
          </div>
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Quantity tracking"
          title="Know how much you have."
          description="Quantity tracking helps you spot what is stocked, what is low, and what may need to go on the next grocery list."
          visual={<QuantityPreview />}
        >
          <CheckList
            items={[
              "Track pantry staples like pasta, rice, canned goods, and snacks",
              "Use low-stock views when quantity reaches one or empty",
              "Avoid buying extras when the pantry already has enough",
            ]}
          />
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Expiration tracking"
          title="Use it before you lose it."
          description="Save expiration dates on food and see what is expired or expiring soon before it gets buried behind the next grocery run."
          visual={<ExpirationPreview />}
          reverse
          tone="soft"
        >
          <CheckList
            items={[
              "Add expiration dates to pantry and refrigerator items",
              "See expired and expiring-soon food in the app",
              "Use date visibility to decide what should be used first",
            ]}
          />
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Restocking"
          title="See what needs restocking."
          description="WhereKeep helps surface low-stock items without pretending to automate the shopping decision for you."
          visual={<RestockPreview />}
        >
          <p className="text-sm leading-7 text-gray-700 sm:text-base">
            Items with quantity one or zero can be treated as low-stock or empty,
            helping your household decide what belongs on the shopping list.
          </p>
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Shopping list"
          title="Turn what you&apos;re missing into a shopping list."
          description="Keep pantry restocking organized with WhereKeep shopping lists for the items your household needs."
          visual={<ShoppingListPreview />}
          reverse
          tone="soft"
        >
          <CheckList
            items={[
              "Add shopping-list items manually when something is missing",
              "Move inventory items to the shopping list when restocking is needed",
              "Track needed and purchased list items for the household",
            ]}
          />
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Household pantry"
          title="One pantry inventory for the household."
          description="Before someone buys another jar, box, or bottle, they can check whether the household already has it."
          visual={<SharingPreview />}
        >
          <CheckList
            items={[
              "Owners manage household access",
              "Editors can help add and organize inventory",
              "Viewers can search and check what is stored",
            ]}
          />
        </TwoColumnSection>

        <section className="border-y border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="Beyond the pantry"
              title="Use the same system for the rest of the kitchen."
              description={
                <>
                  WhereKeep can help organize pantry shelves, refrigerator
                  items, freezer storage, cabinets, and household supplies. It
                  can also help you{" "}
                  <Link
                    href="/home-inventory-app"
                    className="font-semibold text-[var(--stocksense-brand)] hover:brightness-90"
                  >
                    organize your entire home inventory
                  </Link>
                  .
                </>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {beyondPantry.map((item) => (
                <article key={item.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-gray-950">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="How it works"
              title="A pantry tracker that fits real grocery routines."
              description="Start with the foods and supplies you forget most often, then build out the rest of your kitchen inventory over time."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              {steps.map((step, index) => (
                <article key={step.title} className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-sm font-bold text-[var(--stocksense-brand)]">
                    {index + 1}
                  </div>
                  <h2 className="text-base font-semibold text-gray-950">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="Pantry use cases"
              title="Useful before, during, and after grocery shopping."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {useCases.map((useCase) => (
                <article key={useCase.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-gray-950">{useCase.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{useCase.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="Comparison"
              title="Pantry inventory should be easier than a handwritten list."
              description="A list can help for one grocery trip. A shared pantry inventory is built to keep working after items move, expire, or get used."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {comparison.map((group) => (
                <article key={group.title} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
                  <h2 className="text-lg font-semibold text-gray-950">{group.title}</h2>
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
              title="Pantry inventory app questions."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {faqs.map((faq) => (
                <article key={faq.question} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-gray-950">{faq.question}</h2>
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
                    Know what you have before your next grocery run.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-800">
                    Organize your pantry, track what&apos;s running low, and keep
                    expiration dates in one place.
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

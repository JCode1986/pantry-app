import Link from "next/link";
import {
  FaArrowRight,
  FaCheck,
  FaHome,
  FaSearch,
} from "react-icons/fa";
import {
  LuCircleCheck,
  LuFlag,
  LuListChecks,
  LuMapPin,
  LuPackage,
  LuSearch,
  LuShoppingCart,
  LuShieldCheck,
  LuUsers,
  LuWarehouse,
} from "react-icons/lu";
import SiteFooter from "@/components/app-shell/SiteFooter";
import {
  FamilySharingVisual,
  ProductScreenshotCard,
} from "@/components/marketing/AppMockup";
import WhereKeepLogo from "@/components/ui/WhereKeepLogo";
import { createPageMetadata, siteConfig } from "@/utils/metadata";

const pageTitle = "Shared Household Inventory App for Families";
const pageDescription =
  "Share one organized household inventory with the people you live with. WhereKeep helps households track items, storage locations, shopping lists, and responsibilities together.";

export const metadata = createPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/shared-household-inventory",
  twitterCard: "summary_large_image",
});

const heroBenefits = [
  "Shared household inventory",
  "Member roles and permissions",
  "Shopping lists in one place",
  "Assigned tasks and chores",
];

const householdProblems = [
  {
    title: "One person knows where everything is",
    description:
      "Household organization becomes fragile when all the storage knowledge lives with one person.",
  },
  {
    title: "Duplicate purchases happen",
    description:
      "Someone buys more batteries, filters, or pantry staples because nobody checked the shared inventory first.",
  },
  {
    title: "Storage is hard to search",
    description:
      "Bins, shelves, closets, and cabinets are useful only when everyone can find what is inside them.",
  },
  {
    title: "Shopping lists split apart",
    description:
      "Restocking gets messy when grocery needs live in separate notes, texts, and memory.",
  },
  {
    title: "Responsibilities get missed",
    description:
      "Household tasks are easier to coordinate when chores, due dates, and owners are visible.",
  },
  {
    title: "Access needs control",
    description:
      "Sharing works better when members can have different levels of control inside the same household.",
  },
];

const sharedItems = [
  {
    name: "AA Batteries",
    path: "Garage / Storage Bin / Tools",
    quantity: "Qty 8",
    member: "Leah",
    initials: "L",
  },
  {
    name: "Dish Soap",
    path: "Kitchen / Sink Cabinet / Cleaning",
    quantity: "Qty 2",
    member: "Joseph",
    initials: "J",
  },
  {
    name: "Passport Folder",
    path: "Office / File Box / Documents",
    quantity: "Qty 1",
    member: "Ava",
    initials: "A",
  },
];

const roles = [
  {
    role: "Owner",
    initials: "O",
    description: "Manages the household and member access.",
  },
  {
    role: "Editor",
    initials: "E",
    description: "Can help maintain household inventory and details.",
  },
  {
    role: "Viewer",
    initials: "V",
    description: "Can access household information with limited modification permissions.",
  },
];

const householdExamples = [
  {
    title: "Couples",
    description:
      "Both people can check where something is stored before asking or buying another.",
  },
  {
    title: "Families",
    description:
      "Keep household items, supplies, shopping needs, and responsibilities organized.",
  },
  {
    title: "Roommates",
    description:
      "Maintain a shared view of common household items, supplies, and restocking needs.",
  },
  {
    title: "Busy households",
    description:
      "Keep important household information in one place instead of scattered across notes and messages.",
  },
];

const comparison = [
  {
    title: "Notes and group chats",
    points: [
      "Important details get buried",
      "There is no consistent room, shelf, or bin structure",
      "Multiple versions of the same list can exist",
      "It is difficult to search by storage location",
    ],
  },
  {
    title: "WhereKeep",
    points: [
      "Uses structured locations and storage areas",
      "Keeps household items searchable",
      "Tracks quantities and expiration information",
      "Supports shopping lists, member roles, tasks, and chores",
    ],
  },
];

const steps = [
  {
    title: "Create your household",
    description:
      "Set up one organized place for the items, storage areas, and household details you want to track.",
  },
  {
    title: "Invite your household members",
    description:
      "Add the people you live with and choose roles that match how they should use the household.",
  },
  {
    title: "Organize together",
    description:
      "Track items, shopping needs, and household responsibilities from the shared household.",
  },
];

const shoppingRows = [
  ["Coffee filters", "Needed", "Joseph"],
  ["Dish soap", "Needed", "Leah"],
  ["Canned beans", "Purchased", "Ava"],
];

const taskRows = [
  {
    title: "Take out the trash",
    assignee: "Joseph",
    initials: "J",
    due: "Today",
    priority: "High",
  },
  {
    title: "Replace HVAC air filter",
    assignee: "Leah",
    initials: "L",
    due: "Aug 25",
    priority: "Medium",
  },
  {
    title: "Water the plants",
    assignee: "Ava",
    initials: "A",
    due: "Weekly",
    priority: "Low",
  },
];

const faqs = [
  {
    question: "What is a shared household inventory?",
    answer:
      "A shared household inventory is one organized record of household items that multiple members can access, search, and maintain based on their role.",
  },
  {
    question: "Can multiple people use the same WhereKeep household?",
    answer:
      "Yes. WhereKeep supports household members so the people you live with can use the same household inventory.",
  },
  {
    question: "Can I control what household members can change?",
    answer:
      "Yes. WhereKeep uses owner, editor, and viewer roles so not every member needs the same level of control.",
  },
  {
    question: "Can household members search the same inventory?",
    answer:
      "Yes. Members can search shared household items and see where things are stored.",
  },
  {
    question: "Can we share a shopping list?",
    answer:
      "Yes. WhereKeep includes shopping lists so household restocking needs can live near the inventory they relate to.",
  },
  {
    question: "Can tasks be assigned to household members?",
    answer:
      "Yes. WhereKeep supports household tasks, member assignments, due dates, priorities, and recurring chores.",
  },
  {
    question: "Can WhereKeep be used by couples or roommates?",
    answer:
      "Yes. WhereKeep is built for shared households, including couples, families, roommates, and other people organizing the same home.",
  },
];

function SharedHouseholdStructuredData() {
  const pageUrl = new URL("/shared-household-inventory", siteConfig.url).toString();
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
          "WhereKeep is a shared household inventory app for tracking items, storage locations, quantities, shopping lists, tasks, and chores with household members.",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        inLanguage: "en-US",
        featureList: [
          "Shared household inventory",
          "Household members",
          "Owner, editor, and viewer roles",
          "Locations and storage areas",
          "Quantity tracking",
          "Expiration tracking",
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
      href="#how-sharing-works"
      className={`inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 ${className}`}
    >
      See How Sharing Works
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

function MemberAvatar({ initials, label, className = "" }) {
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-xs font-bold text-[var(--stocksense-brand)] ${className}`}
      aria-label={label}
    >
      {initials}
    </span>
  );
}

function StatusBadge({ children, tone = "brand" }) {
  const className =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : tone === "muted"
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]";

  return (
    <span className={`inline-flex shrink-0 rounded-lg border px-2 py-1 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function HeroSharedPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl min-w-0">
      <FamilySharingVisual />
      <div className="mx-auto mt-4 max-w-md rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-sm sm:absolute sm:-bottom-8 sm:left-6 sm:right-6 sm:mt-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--stocksense-brand)]">
            Household snapshot
          </span>
          <div className="flex -space-x-2">
            {["J", "L", "A"].map((initial) => (
              <MemberAvatar
                key={initial}
                initials={initial}
                label={`Household member ${initial}`}
                className="h-8 w-8 ring-2 ring-white"
              />
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          {sharedItems.slice(0, 2).map((item) => (
            <div key={item.name} className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <LuPackage className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-950">{item.name}</p>
                <p className="truncate text-xs text-gray-500">{item.path}</p>
              </div>
              <StatusBadge>{item.quantity}</StatusBadge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SharedInventoryPreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Shared inventory
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            One view for the household
          </h3>
        </div>
        <LuUsers className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-2.5">
        {sharedItems.map((item) => (
          <div key={item.name} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[var(--stocksense-brand)] shadow-sm">
                <LuPackage className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-950">{item.name}</p>
                <p className="mt-1 truncate text-xs text-gray-500">{item.path}</p>
              </div>
              <StatusBadge>{item.quantity}</StatusBadge>
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-gray-100 pt-3">
              <MemberAvatar initials={item.initials} label={`Updated by ${item.member}`} className="h-7 w-7" />
              <span className="min-w-0 truncate text-xs font-semibold text-gray-600">
                Updated by {item.member}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RolePreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Member roles
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Different access for different members
          </h3>
        </div>
        <LuShieldCheck className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-3">
        {roles.map((role) => (
          <div key={role.role} className="flex min-w-0 items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
            <MemberAvatar initials={role.initials} label={`${role.role} role`} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-950">{role.role}</p>
              <p className="mt-1 text-sm leading-5 text-gray-600">{role.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchUseCasePreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900">
          <FaSearch className="h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
          <span>AA Batteries</span>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/70 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--stocksense-brand)] shadow-sm">
            <LuSearch className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-950">AA Batteries</p>
            <p className="mt-1 truncate text-xs text-gray-600">
              Garage / Storage Bin / Tools
            </p>
          </div>
          <StatusBadge>Qty 8</StatusBadge>
        </div>
        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
          <MemberAvatar initials="L" label="Leah" className="h-7 w-7" />
          <span>Stored by Leah</span>
          <span className="text-gray-300" aria-hidden="true">/</span>
          <span>Found before buying more</span>
        </div>
      </div>
    </div>
  );
}

function DuplicatePurchasePreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="grid gap-3">
        {[
          ["Need batteries?", "Search household inventory first", "brand"],
          ["Found AA Batteries", "Garage / Storage Bin / Tools", "brand"],
          ["Shopping list", "No duplicate needed", "muted"],
        ].map(([title, detail, tone], index) => (
          <div key={title} className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-[var(--stocksense-brand)] shadow-sm">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-950">{title}</p>
              <p className="truncate text-xs text-gray-500">{detail}</p>
            </div>
            <StatusBadge tone={tone}>{index === 2 ? "Skipped" : "Checked"}</StatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShoppingPreview() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Shopping list
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Restocking in one place
          </h3>
        </div>
        <LuShoppingCart className="h-5 w-5 shrink-0 text-[var(--stocksense-brand)]" aria-hidden="true" />
      </div>
      <div className="grid gap-2.5">
        {shoppingRows.map(([name, status, member]) => (
          <div key={name} className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${status === "Purchased" ? "border-[var(--stocksense-brand)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]" : "border-gray-300 bg-white text-transparent"}`}>
              <LuCircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
              {name}
            </span>
            <span className="shrink-0 text-xs font-semibold text-gray-500">
              {member}
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
      ? "danger"
      : priority === "Low"
        ? "muted"
        : "warning";

  return (
    <StatusBadge tone={tone}>
      <span className="inline-flex items-center gap-1">
        <LuFlag className="h-3 w-3" aria-hidden="true" />
        {priority}
      </span>
    </StatusBadge>
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
            Shared responsibilities
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
                <p className="truncate text-sm font-semibold text-gray-950">{task.title}</p>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {task.assignee} / {task.due}
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

function LocationPathPreview() {
  const steps = [
    { label: "Home", detail: "Household", icon: FaHome },
    { label: "Garage", detail: "Location", icon: LuMapPin },
    { label: "Storage Bin", detail: "Storage area", icon: LuWarehouse },
    { label: "AA Batteries", detail: "Item", icon: LuPackage },
  ];

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
            Storage path
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-950">
            Everyone sees where it lives
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

export default function SharedHouseholdInventoryPage() {
  return (
    <>
      <SharedHouseholdStructuredData />
      <main className="min-h-[100vh] overflow-hidden bg-white text-gray-900">
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50 to-sky-50">
          <div className="absolute inset-x-0 top-0 h-32 bg-white/70" aria-hidden="true" />
          <MarketingHeader />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-24 lg:pt-8">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                Shared household inventory
              </p>
              <h1 className="text-[2.25rem] font-semibold leading-tight tracking-normal text-[var(--stocksense-brand)] min-[380px]:text-5xl sm:text-6xl lg:text-7xl">
                One household. One place to keep track of everything.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-gray-700 sm:text-lg sm:leading-9">
                Give your household a shared view of what you own, where it is
                stored, what needs restocking, and what needs to get done.
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
            <HeroSharedPreview />
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="The shared household problem"
              title="Everyone should know where things are."
              description="A home gets harder to manage when inventory, shopping needs, and household responsibilities are spread across memory, notes, and messages."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {householdProblems.map((problem) => (
                <article key={problem.title} className="rounded-xl border border-gray-200 bg-gray-50/80 p-5">
                  <div className="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                    <LuUsers className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-950">{problem.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{problem.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <TwoColumnSection
          eyebrow="Shared inventory"
          title="A shared source of truth for your home."
          description="WhereKeep gives household members one place to find items, storage locations, categories, quantities, and useful details."
          visual={<SharedInventoryPreview />}
          tone="soft"
        >
          <CheckList
            items={[
              "Organize items by location, storage area, category, and item",
              "Track quantities and expiration dates where they matter",
              "Give the household a consistent place to find what was added or organized",
            ]}
          />
          <p className="mt-4 text-sm leading-7 text-gray-700 sm:text-base">
            For the broader whole-home workflow, see how WhereKeep works as a{" "}
            <Link
              href="/home-inventory-app"
              className="font-semibold text-[var(--stocksense-brand)] hover:brightness-90"
            >
              home inventory app
            </Link>
            .
          </p>
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Members and roles"
          title="Organize together, without giving everyone the same control."
          description="Households can share access while keeping permissions aligned with each member's role."
          visual={<RolePreview />}
        >
          <CheckList
            items={[
              "Owners manage the household and member access",
              "Editors can help maintain household inventory",
              "Viewers can access household information with limited modification permissions",
            ]}
          />
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Shared search"
          title="Find it even when you were not the one who put it away."
          description="When someone stores an item, another household member can later search for it and see where it belongs."
          visual={<SearchUseCasePreview />}
          reverse
          tone="soft"
        >
          <div className="rounded-2xl border border-[var(--stocksense-brand-border)] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900">Example scenario</p>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Leah stores AA batteries in a garage storage bin. Joseph searches
              for them later and sees the location path before opening a drawer
              or buying another pack.
            </p>
          </div>
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Avoid duplicates"
          title="Check before someone buys another one."
          description="A shared inventory helps household members see whether an item already exists before it lands on the shopping list."
          visual={<DuplicatePurchasePreview />}
        >
          <CheckList
            items={[
              "Search existing household items before shopping",
              "Check quantities and storage locations together",
              "Use shopping lists for what is actually missing",
            ]}
          />
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Shared shopping"
          title="Keep household restocking in one place."
          description="Shopping lists help restocking needs stay close to the household inventory they relate to."
          visual={<ShoppingPreview />}
          reverse
          tone="soft"
        >
          <p className="text-sm leading-7 text-gray-700 sm:text-base">
            WhereKeep supports shared shopping-list workflows without claiming
            automatic ordering or grocery-store integrations. Add what is needed,
            mark items as purchased, and keep restocking visible to the household.
          </p>
        </TwoColumnSection>

        <TwoColumnSection
          eyebrow="Tasks and chores"
          title="Share the work, too."
          description="Household organization includes both what you own and what needs to get done."
          visual={<TasksPreview />}
        >
          <CheckList
            items={[
              "Create household tasks",
              "Assign tasks to members",
              "Set due dates and priorities",
              "Use recurring chores for repeat responsibilities",
            ]}
          />
        </TwoColumnSection>

        <section className="border-y border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="Household examples"
              title="Built for the way households actually organize."
              description="WhereKeep is useful anywhere multiple people need the same household information."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {householdExamples.map((example) => (
                <article key={example.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-gray-950">{example.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{example.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div className="min-w-0">
              <SectionHeader
                align="left"
                eyebrow="Privacy and permissions"
                title="Sharing does not mean everyone has unrestricted control."
                description="WhereKeep uses role-based access so a shared household can stay useful without giving every member the same responsibilities."
              />
              <CheckList
                items={[
                  "Owners manage household membership",
                  "Editors can help keep shared inventory current",
                  "Viewers can find household information without broad editing access",
                ]}
              />
            </div>
            <div className="min-w-0">
              <FamilySharingVisual />
            </div>
          </div>
        </section>

        <section id="how-sharing-works" className="scroll-mt-20 border-y border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="How it works"
              title="Set up the household once, then organize together."
              description="Start with your core household areas, invite members, and build the shared inventory over time."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              {steps.map((step, index) => (
                <article key={step.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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

        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="Storage example"
              title="Shared inventory still needs real structure."
              description="WhereKeep connects the household, location, storage area, and item so the information stays useful when more people rely on it."
            />
            <LocationPathPreview />
          </div>
        </section>

        <section className="border-y border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="Product preview"
              title="Shared household organization beyond one list."
              description="Use WhereKeep to track inventory, search storage, and add item details from one household system."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <ProductScreenshotCard type="dashboard" />
              <ProductScreenshotCard type="search" />
              <ProductScreenshotCard type="addItem" />
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SectionHeader
              eyebrow="Comparison"
              title="Your household inventory should not live in a group chat."
              description="Messages and notes can help in the moment, but a shared inventory needs structure that stays searchable."
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
              title="Shared household inventory questions."
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
                    Keep your household on the same page.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-800">
                    Organize what you own, where it is stored, what needs
                    restocking, and what needs to get done.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-[var(--stocksense-brand)]">
                    <Link href="/" className="hover:brightness-90">
                      Visit the homepage
                    </Link>
                    <Link href="/pantry-inventory-app" className="hover:brightness-90">
                      Pantry inventory
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

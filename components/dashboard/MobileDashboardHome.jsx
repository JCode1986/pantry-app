"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FaBell,
  FaBoxOpen,
  FaCamera,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaShoppingBasket,
  FaTags,
  FaWarehouse,
} from "react-icons/fa";

const pageSectionVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const pageItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, type: "spring", stiffness: 120 },
  },
};

function openSearch() {
  window.dispatchEvent(new CustomEvent("stocksense:open-item-search"));
}

function openAddItem() {
  window.dispatchEvent(
    new CustomEvent("stocksense:open-add-item", {
      detail: null,
    })
  );
}

function readNested(obj, paths) {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce((current, key) => current?.[key], obj);
    if (value !== null && value !== undefined && value !== "") return value;
  }

  return null;
}

function activityEntityName(row) {
  const changes = row?.changes || {};
  return (
    readNested(
      { ...row, changes },
      [
        "item_name",
        "name_at_event",
        "item_or_entity_name",
        "changes.name.to",
        "changes.name.from",
        "changes.snapshot.name",
        "changes.old.name",
        "changes.from_deleted_item.name",
      ]
    ) || "Activity"
  );
}

function activityActionLabel(row) {
  const action = String(row?.action || "").toLowerCase();
  const entity = String(row?.entity_type || "").toLowerCase();
  const statusTo = row?.changes?.status?.to;

  if (entity === "shopping_list_item" && action === "updated") {
    if (statusTo === "purchased") return "Purchased";
    if (statusTo === "needed") return "Marked needed";
    if (statusTo === "dismissed") return "Dismissed";
  }

  if (action === "added") return "Added";
  if (action === "deleted") return "Removed";
  if (action === "moved") return "Moved";
  if (action === "updated") return "Updated";
  return "Activity";
}

function activityActionClass(row) {
  const action = String(row?.action || "").toLowerCase();
  const classes = {
    added: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    updated: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    deleted: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    moved: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  };

  return classes[action] ?? classes.updated;
}

function activityTone(row) {
  const entity = String(row?.entity_type || "").toLowerCase();

  if (entity === "location") return "location";
  if (entity === "storage_area") return "area";
  if (entity === "category") return "category";
  if (entity === "shopping_list_item") return "shopping";
  return "item";
}

function activityIcon(row) {
  const entity = String(row?.entity_type || "").toLowerCase();

  if (entity === "location") return FaMapMarkedAlt;
  if (entity === "storage_area") return FaWarehouse;
  if (entity === "category") return FaTags;
  if (entity === "shopping_list_item") return FaShoppingBasket;
  return FaBoxOpen;
}

function activityPath(row) {
  const changes = row?.changes || {};
  const location = readNested(
    { ...row, changes },
    [
      "location_name",
      "changes.location_name",
      "changes.location",
      "changes.snapshot.location_name",
      "changes.snapshot.location",
    ]
  );
  const area = readNested(
    { ...row, changes },
    [
      "storage_area_name",
      "changes.storage_area_name",
      "changes.storage_area",
      "changes.area",
      "changes.snapshot.storage_area_name",
      "changes.snapshot.storage_area",
      "changes.snapshot.area",
    ]
  );
  const category = readNested(
    { ...row, changes },
    [
      "category_name",
      "changes.category_name",
      "changes.category",
      "changes.snapshot.category_name",
      "changes.snapshot.category",
    ]
  );

  return [location, area, category].filter(Boolean).join(" > ");
}

function formatRelativeDate(value) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfDate = new Date(date);
  startOfDate.setHours(0, 0, 0, 0);

  const days = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86400000
  );

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function daysUntilDate(value) {
  if (!value) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);

  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function formatExpirationLabel(value) {
  const days = daysUntilDate(value);

  if (days === null) return "Date unknown";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days left`;
}

const iconTones = {
  location: {
    accent: "var(--entity-location-accent)",
    soft: "var(--entity-location-soft)",
    border: "var(--entity-location-border)",
  },
  area: {
    accent: "var(--entity-area-accent)",
    soft: "var(--entity-area-soft)",
    border: "var(--entity-area-border)",
  },
  category: {
    accent: "var(--entity-category-accent)",
    soft: "var(--entity-category-soft)",
    border: "var(--entity-category-border)",
  },
  item: {
    accent: "var(--entity-item-accent)",
    soft: "var(--entity-item-soft)",
    border: "var(--entity-item-border)",
  },
  shopping: {
    accent: "var(--entity-shopping-accent)",
    soft: "var(--entity-shopping-soft)",
    border: "var(--entity-shopping-border)",
  },
  warning: {
    accent: "var(--entity-warning-accent)",
    soft: "var(--entity-warning-soft)",
    border: "var(--entity-warning-border)",
  },
  brand: {
    accent: "var(--stocksense-brand)",
    soft: "var(--stocksense-brand-soft)",
    border: "var(--stocksense-brand-border)",
  },
};

function IconCircle({ icon: Icon, tone = "brand", filled = false, className = "" }) {
  const colors = iconTones[tone] || iconTones.brand;

  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${filled ? "text-white" : ""} ${className}`}
      style={{
        background: filled ? colors.accent : colors.soft,
        borderColor: colors.border,
        color: filled ? undefined : colors.accent,
      }}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

function Hero({ greeting, userName }) {
  return (
    <section className="pt-5">
      <p className="text-sm font-semibold text-gray-700">
        {greeting}, {userName}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
        What are you looking for?
      </h1>
      <button
        type="button"
        onClick={openSearch}
        className="mt-4 flex min-h-12 w-full items-center gap-3 rounded-full border border-gray-200 bg-white px-4 text-left text-sm text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]"
      >
        <FaSearch className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" />
        <span className="min-w-0 flex-1 truncate">Find an item...</span>
      </button>
    </section>
  );
}

function StatTile({ icon, tone, value, label, href }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <IconCircle icon={icon} tone={tone} filled className="h-10 w-10 rounded-xl" />
        <span className="text-2xl font-semibold tracking-tight text-gray-950">
          {value}
        </span>
      </div>
      <div className="mt-3 text-sm font-semibold text-gray-700">{label}</div>
    </Link>
  );
}

function HomeOverview({ totals, isEmpty, canEditInventory }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-base font-semibold text-gray-950">
        Your home at a glance
      </h2>
      {isEmpty ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm leading-6 text-slate-500">
            Add one item and WhereKeep will start building your home memory.
          </p>
          {canEditInventory && (
            <button
              type="button"
              onClick={openAddItem}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white"
            >
              <FaPlus className="h-4 w-4" />
              Add first item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile
            icon={FaMapMarkerAlt}
            tone="location"
            value={totals.locations ?? 0}
            label="Locations"
            href="/locations"
          />
          <StatTile
            icon={FaWarehouse}
            tone="area"
            value={totals.areas ?? 0}
            label="Storage areas"
            href="/areas"
          />
          <StatTile
            icon={FaTags}
            tone="category"
            value={totals.categories ?? 0}
            label="Categories"
            href="/categories"
          />
          <StatTile
            icon={FaBoxOpen}
            tone="item"
            value={totals.items ?? 0}
            label="Items"
            href="/items"
          />
          <StatTile
            icon={FaShoppingBasket}
            tone="shopping"
            value={totals.shoppingListItems ?? 0}
            label="Shopping list"
            href="/shopping-list"
          />
        </div>
      )}
    </section>
  );
}

function RecentActivitySummary({ items, canEditInventory }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-950">
          Recent activity
        </h2>
        {items.length > 0 && (
          <Link href="/activity" className="text-sm font-semibold text-[var(--stocksense-brand)]">
            See all
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <IconCircle icon={FaBoxOpen} tone="item" />
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-gray-950">
                No recent activity
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                New additions, updates, moves, and shopping list changes will show here.
              </p>
              {canEditInventory && (
                <button
                  type="button"
                  onClick={openAddItem}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white"
                >
                  <FaCamera className="h-4 w-4" />
                  Scan your first item
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <IconCircle icon={item.icon} tone={item.tone} filled className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.actionClass}`}>
                    {item.actionLabel}
                  </span>
                  <span className="truncate text-sm font-semibold text-gray-950">
                    {item.name}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-slate-500">
                  {item.path || item.detail || "Details unavailable"}
                </div>
                <div className="mt-1 text-xs font-medium text-gray-500">
                  {item.dateLabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ExpiringSoon({ items }) {
  if (!items.length) return null;

  return (
    <section className="mt-5">
      <h2 className="mb-2 text-base font-semibold text-gray-950">
        Expiring soon
      </h2>
      <div className="grid gap-2.5">
        {items.map((item) => {
          const path = [item.locationName, item.areaName, item.categoryName]
            .filter(Boolean)
            .join(" > ");

          return (
            <Link
              key={item.id}
              href="/items?expiration=soon&days=3"
              className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <IconCircle icon={FaBell} tone="warning" filled className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-gray-950">
                  {item.name}
                </div>
                <div className="mt-1 truncate text-xs text-slate-500">
                  {path || "No place saved yet"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.expirationDate || "No date"}
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--entity-warning-border)] bg-[var(--entity-warning-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--entity-warning-accent)]">
                {formatExpirationLabel(item.expirationDate)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function MobileDashboardHome({
  userName = "there",
  greeting = "Good morning",
  totals = {},
  expirationNotifications = {},
  recentActivityItems = [],
  canEditInventory = true,
}) {
  const recentActivity = useMemo(
    () =>
      (recentActivityItems ?? [])
        .slice(0, 5)
        .map((row, index) => ({
          id: row.id ?? row.item_id ?? row.entity_id ?? index,
          name: activityEntityName(row),
          actionLabel: activityActionLabel(row),
          actionClass: activityActionClass(row),
          path: activityPath(row),
          detail: row.entity_type
            ? String(row.entity_type).replaceAll("_", " ")
            : null,
          dateLabel: formatRelativeDate(row.created_at),
          tone: activityTone(row),
          icon: activityIcon(row),
        })),
    [recentActivityItems]
  );

  const expiringItems = (expirationNotifications.items ?? [])
    .filter((item) => {
      const days = daysUntilDate(item.expirationDate);
      return days !== null && days >= 0;
    })
    .slice(0, 3);

  const isEmpty =
    (totals.locations ?? 0) +
      (totals.areas ?? 0) +
      (totals.items ?? 0) +
      (totals.shoppingListItems ?? 0) ===
    0;
  return (
    <main className="min-h-[calc(100dvh-61px)] overflow-x-hidden px-5 text-gray-700 md:hidden">
      <motion.div
        variants={pageSectionVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={pageItemVariants}>
          <Hero greeting={greeting} userName={userName} />
        </motion.div>
        <motion.div variants={pageItemVariants}>
          <HomeOverview
            totals={totals}
            isEmpty={isEmpty}
            canEditInventory={canEditInventory}
          />
        </motion.div>
        <motion.div variants={pageItemVariants}>
          <ExpiringSoon items={expiringItems} />
        </motion.div>
        <motion.div variants={pageItemVariants}>
          <RecentActivitySummary
            items={recentActivity}
            canEditInventory={canEditInventory}
          />
        </motion.div>
      </motion.div>
    </main>
  );
}

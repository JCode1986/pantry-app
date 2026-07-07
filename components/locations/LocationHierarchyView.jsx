"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FaBarcode,
  FaBoxOpen,
  FaChevronDown,
  FaClock,
  FaLayerGroup,
  FaMapMarkedAlt,
  FaSearch,
  FaTags,
  FaWarehouse,
} from "react-icons/fa";
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";
import { daysUntil, isExpiringSoon } from "@/utils/pantry/date";
import { containsQuery } from "@/utils/pantry/search";

const pageVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.03 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, type: "spring", stiffness: 140 },
  },
};

function countTotals(storageAreas = []) {
  return storageAreas.reduce(
    (totals, area) => {
      const categories = area.categories ?? [];
      const items = categories.flatMap((category) => category.items ?? []);

      totals.areas += 1;
      totals.categories += categories.length;
      totals.items += items.length;
      totals.expiringSoon += items.filter((item) =>
        isExpiringSoon(item.expiration_date, 7)
      ).length;

      return totals;
    },
    { areas: 0, categories: 0, items: 0, expiringSoon: 0 }
  );
}

function itemMatches(item, query) {
  if (!query) return true;
  return containsQuery(item.name, query) || containsQuery(item.barcode, query);
}

function categoryMatches(category, query) {
  if (!query) return true;
  return (
    containsQuery(category.name, query) ||
    (category.items ?? []).some((item) => itemMatches(item, query))
  );
}

function areaMatches(area, query) {
  if (!query) return true;
  return (
    containsQuery(area.name, query) ||
    (area.categories ?? []).some((category) => categoryMatches(category, query))
  );
}

function filterHierarchy(storageAreas, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return storageAreas;

  return (storageAreas ?? [])
    .filter((area) => areaMatches(area, normalizedQuery))
    .map((area) => ({
      ...area,
      categories: containsQuery(area.name, normalizedQuery)
        ? area.categories ?? []
        : (area.categories ?? [])
            .filter((category) => categoryMatches(category, normalizedQuery))
            .map((category) => ({
              ...category,
              items: containsQuery(category.name, normalizedQuery)
                ? category.items ?? []
                : (category.items ?? []).filter((item) =>
                    itemMatches(item, normalizedQuery)
                  ),
            })),
    }));
}

function StatCard({ icon: Icon, label, value, tone = "brand" }) {
  const toneClasses =
    tone === "warning"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <Icon className="h-4 w-4 shrink-0" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-stocksense-teal">{value}</p>
    </div>
  );
}

function EmptyState({ canEditInventory, locationId }) {
  return (
    <div className="rounded-2xl border border-dashed border-stocksense-gray bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
        <FaBoxOpen className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        Nothing stored here yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
        Add an item and create its storage area and category in one flow. This page
        will turn into a simple hierarchy as the location fills up.
      </p>
      {canEditInventory && (
        <div className="mt-5 flex justify-center">
          <OpenGlobalAddItemButton context={{ locationId }}>
            Add item here
          </OpenGlobalAddItemButton>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item }) {
  const days = daysUntil(item.expiration_date);
  const soon = isExpiringSoon(item.expiration_date, 7);

  return (
    <div className="group flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 transition hover:border-[var(--stocksense-brand-border)] hover:bg-white">
      {item.imageUrl ? (
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-white">
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] text-[var(--entity-item-accent)]">
          <FaBoxOpen className="h-4 w-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
          {soon && (
            <span className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-700">
              {days < 0 ? "Expired" : "Soon"}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>Qty: {item.quantity ?? 0}</span>
          <span>Exp: {item.expiration_date || "None"}</span>
          {item.barcode && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <FaBarcode className="h-3 w-3" />
              <span className="truncate">{item.barcode}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryBlock({ category, area, locationId, canEditInventory }) {
  const items = category.items ?? [];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
              <FaTags className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {category.name}
              </p>
              <p className="text-xs text-gray-500">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
        </div>

        {canEditInventory && (
          <OpenGlobalAddItemButton
            variant="flat"
            className="shrink-0 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 text-xs text-[var(--stocksense-brand)]"
            context={{
              locationId,
              storageAreaId: area.id,
              categoryId: category.id,
            }}
          >
            Add
          </OpenGlobalAddItemButton>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        {items.length > 0 ? (
          items.map((item) => <ItemRow key={item.id} item={item} />)
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
            No items in this category yet.
          </div>
        )}
      </div>
    </div>
  );
}

function AreaSection({ area, locationId, canEditInventory, defaultOpen, forceOpen }) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const categories = area.categories ?? [];
  const itemCount = categories.reduce(
    (sum, category) => sum + (category.items?.length ?? 0),
    0
  );
  const open = forceOpen || localOpen;

  return (
    <motion.article
      variants={itemVariants}
      className="overflow-hidden rounded-2xl border border-stocksense-gray bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={() => setLocalOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 border-t-4 border-[var(--entity-area-accent)] p-4 text-left transition hover:bg-gray-50"
      >
        <div className="flex min-w-0 gap-3">
          {area.imageUrl ? (
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--entity-area-border)] bg-white">
              <img src={area.imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
              <FaWarehouse className="h-5 w-5" />
            </div>
          )}

          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">
              {area.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {categories.length} {categories.length === 1 ? "category" : "categories"} |{" "}
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <FaChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50/70 p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {area.name} hierarchy
            </p>
            {canEditInventory && (
              <OpenGlobalAddItemButton
                variant="flat"
                className="w-full rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] sm:w-auto"
                context={{ locationId, storageAreaId: area.id }}
              >
                Add item to area
              </OpenGlobalAddItemButton>
            )}
          </div>

          <div className="grid gap-3">
            {categories.length > 0 ? (
              categories.map((category) => (
                <CategoryBlock
                  key={category.id}
                  category={category}
                  area={area}
                  locationId={locationId}
                  canEditInventory={canEditInventory}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500">
                No categories yet. Add an item to this area and create the category
                in the add flow.
              </div>
            )}
          </div>
        </div>
      )}
    </motion.article>
  );
}

export default function LocationHierarchyView({
  location,
  storageAreas = [],
  canEditInventory = true,
}) {
  const [query, setQuery] = useState("");
  const totals = useMemo(() => countTotals(storageAreas), [storageAreas]);
  const filteredAreas = useMemo(
    () => filterHierarchy(storageAreas, query.trim()),
    [query, storageAreas]
  );
  const hasSearch = query.trim().length > 0;

  return (
    <motion.main
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="page-enter mx-auto max-w-[1500px] px-5 py-8 md:min-h-[100vh] max-md:pb-0 max-md:pt-4"
    >
      <motion.header
        variants={itemVariants}
        className="overflow-hidden rounded-2xl border border-stocksense-gray bg-white shadow-sm"
      >
        <div className="border-t-4 border-[var(--entity-location-accent)] p-5">
          <Link
            href="/locations"
            className="inline-flex text-sm font-medium text-[var(--stocksense-brand)] hover:underline"
          >
            Back to locations
          </Link>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 gap-4">
              {location.imageUrl ? (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--entity-location-border)] bg-white">
                  <img
                    src={location.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[var(--entity-location-border)] bg-[var(--entity-location-soft)] text-[var(--entity-location-accent)]">
                  <FaMapMarkedAlt className="h-6 w-6" />
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Location
                </p>
                <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-gray-950">
                  {location.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-500">
                  Browse this location by storage area, category, and item. Add new
                  inventory through one guided flow.
                </p>
              </div>
            </div>

            {canEditInventory && (
              <OpenGlobalAddItemButton
                className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white lg:w-auto"
                context={{ locationId: location.id }}
              >
                Add item here
              </OpenGlobalAddItemButton>
            )}
          </div>
        </div>
      </motion.header>

      <motion.section
        variants={itemVariants}
        className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard icon={FaWarehouse} label="Areas" value={totals.areas} />
        <StatCard icon={FaTags} label="Categories" value={totals.categories} />
        <StatCard icon={FaBoxOpen} label="Items" value={totals.items} />
        <StatCard
          icon={FaClock}
          label="Attention"
          value={totals.expiringSoon}
          tone="warning"
        />
      </motion.section>

      <motion.section
        variants={itemVariants}
        className="mt-5 rounded-2xl border border-stocksense-gray bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Hierarchy</h2>
            <p className="text-sm text-gray-500">
              Storage areas contain categories. Categories contain items.
            </p>
          </div>

          <div className="relative md:w-[360px]">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this location..."
              className="h-11 w-full rounded-xl border border-stocksense-gray bg-white pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-[var(--stocksense-brand)]"
            />
          </div>
        </div>
      </motion.section>

      <motion.section variants={pageVariants} className="mt-5 space-y-4">
        {storageAreas.length === 0 ? (
          <EmptyState canEditInventory={canEditInventory} locationId={location.id} />
        ) : filteredAreas.length === 0 ? (
          <div className="rounded-2xl border border-stocksense-gray bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
            No matches in this location.
          </div>
        ) : (
          filteredAreas.map((area) => (
          <AreaSection
              key={area.id}
              area={area}
              locationId={location.id}
              canEditInventory={canEditInventory}
              defaultOpen={hasSearch || filteredAreas.length <= 3}
              forceOpen={hasSearch}
            />
          ))
        )}
      </motion.section>

      <motion.section
        variants={itemVariants}
        className="mt-5 rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--stocksense-brand)]">
              <FaLayerGroup className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--stocksense-brand)]">
                Need to rename or reorganize?
              </h2>
              <p className="mt-1 text-sm text-[var(--stocksense-brand)]/80">
                Use the dedicated area, category, and item pages for bulk edits,
                moves, and cleanup.
              </p>
            </div>
          </div>
          <Link
            href="/areas"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-4 text-sm font-medium text-[var(--stocksense-brand)]"
          >
            Manage structure
          </Link>
        </div>
      </motion.section>
    </motion.main>
  );
}

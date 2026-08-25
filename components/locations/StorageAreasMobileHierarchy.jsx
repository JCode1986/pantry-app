"use client";

import { AnimatePresence, motion } from "@/components/ui/MotionLite";
import {
  FaChevronUp,
  FaEdit,
  FaLayerGroup,
  FaPlus,
  FaSearch,
  FaTags,
  FaTrash,
  FaWarehouse,
} from "react-icons/fa";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
import NativeSelect from "@/components/ui/NativeSelect";
import PaginationControls from "@/components/ui/PaginationControls";
import SearchResultsLoadingState from "@/components/ui/SearchResultsLoadingState";
import SearchInput from "@/components/locations/StorageAreaSearchInput";

const collapseVariants = {
  collapsed: { height: 0, opacity: 0, transition: { duration: 0.2 } },
  open: { height: "auto", opacity: 1, transition: { duration: 0.25 } },
};

const pageVariants = {
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

export default function StorageAreasMobileHierarchy({
  canEditInventory,
  clearSearch,
  currentPage,
  endItem,
  expandedAreas,
  expSoonEnabled,
  hierarchyFiltersActive,
  isLoadingStorageAreas,
  loadCategoryItems,
  locationName,
  normalizedSearch,
  onCreateArea,
  onCreateCategory,
  onDelete,
  onEditArea,
  onNextPage,
  onPreviousPage,
  onSearchChange,
  onSetMobileCategorySheet,
  onSortChange,
  search,
  showSearchRestoreLoader,
  sortBy,
  sortOptions,
  startItem,
  storageAreas,
  toggleArea,
  totalPages,
  totalStorageAreaCount,
  visibleStorageAreas,
}) {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-3 md:hidden"
    >
      <motion.div
        variants={pageItemVariants}
        initial="hidden"
        animate="show"
        className="flex items-end justify-between gap-3"
      >
        <div>
          <h2 className="text-base font-semibold text-gray-950">Storage areas</h2>
          <p className="mt-1 text-sm text-gray-600">
            Browse the places inside this location.
          </p>
        </div>
        {canEditInventory && storageAreas.length > 0 ? (
          <button
            onClick={onCreateArea}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white"
          >
            <FaPlus className="h-3 w-3" /> Add
          </button>
        ) : null}
      </motion.div>

      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder={`Search ${locationName}`}
        className="min-h-11"
      />

      <NativeSelect
        aria-label="Sort storage areas"
        value={sortBy}
        onChange={(value) => onSortChange(value || "name_asc")}
        options={sortOptions}
        className="w-full"
      />

      {showSearchRestoreLoader ? (
        <SearchResultsLoadingState
          label="Loading inventory"
          detail="Restoring everything in this location."
        />
      ) : storageAreas.length === 0 && !hierarchyFiltersActive ? (
        <motion.div
          variants={pageItemVariants}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center shadow-sm"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
            <FaWarehouse className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-950">
            No storage areas yet
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Create the first storage area for this location.
          </p>
          {canEditInventory ? (
            <div className="mt-4">
              <button
                onClick={onCreateArea}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[var(--stocksense-brand)] shadow-sm"
              >
                <FaPlus /> New storage area
              </button>
            </div>
          ) : null}
        </motion.div>
      ) : visibleStorageAreas.length === 0 ? (
        <motion.div
          variants={pageItemVariants}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
            <FaSearch className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-950">
            No matching inventory
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {normalizedSearch
              ? `Nothing matched "${search.trim()}". Clear the search or try a different term.`
              : "Try another search or adjust the expiration filter."}
          </p>
          {normalizedSearch ? (
            <button
              type="button"
              onClick={clearSearch}
              className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 text-sm font-semibold text-[var(--stocksense-brand)] transition hover:brightness-95"
            >
              Clear search
            </button>
          ) : null}
        </motion.div>
      ) : (
        visibleStorageAreas.map((area) => {
          const visibleCategories = area.visibleCategories ?? [];
          const areaItemCount = area.areaItemCount ?? 0;

          return (
            <motion.article
              key={area.id}
              variants={pageItemVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              className="overflow-hidden rounded-2xl border border-stocksense-gray bg-white shadow-sm"
            >
              <div className="border-t-4 border-[var(--entity-area-accent)] p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleArea(area.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    aria-expanded={Boolean(expandedAreas[area.id])}
                    aria-label={`${expandedAreas[area.id] ? "Collapse" : "Expand"} ${area.name}`}
                  >
                    {area.imageUrl ? (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--entity-area-border)] bg-white">
                        <ImageWithLoader
                          src={area.imageThumbUrl || area.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--entity-area-border)] bg-[var(--entity-area-soft)] text-[var(--entity-area-accent)]">
                        <FaWarehouse className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold text-gray-900">
                        {area.name}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {(area.categories || []).length}{" "}
                        {(area.categories || []).length === 1 ? "category" : "categories"}{" "}
                        | {areaItemCount} {areaItemCount === 1 ? "item" : "items"}
                      </p>
                    </div>

                    <FaChevronUp
                      className={`mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                        expandedAreas[area.id] ? "" : "rotate-180"
                      }`}
                    />
                  </button>
                </div>

                {canEditInventory ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onEditArea(area)}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2 text-xs font-medium text-amber-700"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() =>
                        onDelete("area", {
                          areaId: area.id,
                          name: area.name,
                        })
                      }
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2 text-xs font-medium text-rose-700"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                ) : null}
              </div>

              <AnimatePresence initial={false}>
                {expandedAreas[area.id] ? (
                  <motion.div
                    key={`${area.id}-mobile-content`}
                    variants={collapseVariants}
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 border-t border-gray-100 bg-gray-50/70 p-3">
                      {visibleCategories.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-sm text-gray-500">
                          {normalizedSearch
                            || expSoonEnabled
                            ? "No matching categories or items."
                            : "No categories yet."}
                        </div>
                      ) : (
                        visibleCategories.map((category) => {
                          const itemCount =
                            category.itemsCount ?? category.visibleItems?.length ?? 0;

                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => {
                                onSetMobileCategorySheet({
                                  areaId: area.id,
                                  categoryId: category.id,
                                });
                                void loadCategoryItems(category.id);
                              }}
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                {category.imageUrl ? (
                                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[var(--entity-category-border)] bg-white">
                                    <ImageWithLoader
                                      src={category.imageThumbUrl || category.imageUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--entity-category-border)] bg-[var(--entity-category-soft)] text-[var(--entity-category-accent)]">
                                    <FaTags className="h-4 w-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-900">
                                    {category.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {itemCount} {itemCount === 1 ? "item" : "items"}
                                  </p>
                                </div>
                              </div>
                              <FaChevronUp className="h-3.5 w-3.5 rotate-90 text-gray-400" />
                            </button>
                          );
                        })
                      )}

                      {canEditInventory ? (
                        <button
                          onClick={() => onCreateCategory(area)}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--stocksense-brand-border)] bg-white text-sm font-medium text-[var(--stocksense-brand)]"
                        >
                          <FaLayerGroup /> New category
                        </button>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.article>
          );
        })
      )}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        startItem={startItem}
        endItem={endItem}
        totalItems={totalStorageAreaCount}
        isLoading={isLoadingStorageAreas}
        onPrevious={onPreviousPage}
        onNext={onNextPage}
      />
    </motion.div>
  );
}

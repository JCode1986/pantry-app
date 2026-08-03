"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import NativeButton from "@/components/ui/NativeButton";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import { modalContentStyle } from "@/components/modals/modalTheme";
import NativeSelect from "@/components/ui/NativeSelect";
import { toPositiveInteger } from "@/utils/pantry/date";

const ALL_FILTER_KEY = "all";
const EXPIRATION_FILTERS = {
  ALL: "all",
  EXPIRED: "expired",
  SOON: "soon",
  NONE: "none",
};
const STOCK_FILTERS = {
  ALL: "all",
  IN_STOCK: "in_stock",
  LOW_OR_EMPTY: "low_or_empty",
};
const SORT_OPTIONS = {
  NAME_ASC: "name_asc",
};

export default function ItemsFilterSheet({
  isOpen,
  onOpenChange,
  onLoadHierarchy,
  isLoadingHierarchy,
  hierarchyError,
  locationFilter,
  areaFilter,
  categoryFilter,
  expirationFilter,
  stockFilter,
  sortBy,
  expDays,
  locationOptions,
  areaOptions,
  categoryOptions,
  sortLabels,
  onLocationFilterChange,
  onAreaFilterChange,
  onCategoryFilterChange,
  onExpirationFilterChange,
  onStockFilterChange,
  onSortChange,
  onExpDaysChange,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (open) void onLoadHierarchy();
      }}
      placement="bottom"
      size="full"
      classNames={{
        wrapper: "items-end md:hidden",
        base: "m-0 w-full max-w-none rounded-t-3xl border-0 bg-white shadow-2xl md:hidden",
      }}
    >
      <ModalContent
        className="wherekeep-modal-content max-h-[88svh] w-full overflow-hidden rounded-t-3xl bg-white text-gray-700 md:hidden"
        style={modalContentStyle}
      >
        {() => (
          <>
            <ModalHeader className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 py-3 text-[var(--stocksense-brand)]">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-[var(--stocksense-brand)]">
                  Filters
                </h2>
              </div>
              <MobileSheetCloseButton onPress={() => onOpenChange(false)} />
            </ModalHeader>

            <ModalBody className="wherekeep-modal-body min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-6">
              {isLoadingHierarchy ? (
                <div className="rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/40 px-3 py-2 text-sm font-medium text-[var(--stocksense-brand)]">
                  Loading locations, storage areas, and categories...
                </div>
              ) : null}
              {hierarchyError ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <span>{hierarchyError}</span>
                  <NativeButton
                    size="sm"
                    color="danger"
                    variant="flat"
                    className="rounded-xl self-start"
                    onPress={() => onLoadHierarchy({ force: true })}
                  >
                    Retry
                  </NativeButton>
                </div>
              ) : null}

              <NativeSelect
                aria-label="Filter by location"
                label="Location"
                value={locationFilter}
                onChange={(value) =>
                  onLocationFilterChange(value || ALL_FILTER_KEY)
                }
                onOpen={() => void onLoadHierarchy()}
                options={[
                  { value: ALL_FILTER_KEY, label: "All locations" },
                  ...locationOptions.map((location) => ({
                    value: String(location.id),
                    label: location.name,
                  })),
                ]}
              />

              <NativeSelect
                aria-label="Filter by storage area"
                label="Storage Area"
                value={areaFilter}
                onChange={(value) => onAreaFilterChange(value || ALL_FILTER_KEY)}
                onOpen={() => void onLoadHierarchy()}
                disabled={isLoadingHierarchy || areaOptions.length === 0}
                options={[
                  { value: ALL_FILTER_KEY, label: "All storage areas" },
                  ...areaOptions.map((area) => ({
                    value: String(area.id),
                    label:
                      locationFilter === ALL_FILTER_KEY
                      ? `${area.name} - ${area.locationName}`
                      : area.name,
                  })),
                ]}
              />

              <NativeSelect
                aria-label="Filter by category"
                label="Category"
                value={categoryFilter}
                onChange={(value) =>
                  onCategoryFilterChange(value || ALL_FILTER_KEY)
                }
                onOpen={() => void onLoadHierarchy()}
                disabled={isLoadingHierarchy || categoryOptions.length === 0}
                options={[
                  { value: ALL_FILTER_KEY, label: "All categories" },
                  ...categoryOptions.map((category) => ({
                    value: String(category.id),
                    label:
                      locationFilter === ALL_FILTER_KEY
                      ? `${category.name} - ${category.areaName} - ${category.locationName}`
                      : areaFilter === ALL_FILTER_KEY
                        ? `${category.name} - ${category.areaName}`
                        : category.name,
                  })),
                ]}
              />

              <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
                <NativeSelect
                  aria-label="Filter by expiration"
                  label="Expiration"
                  value={expirationFilter}
                  onChange={(value) =>
                    onExpirationFilterChange(
                      value || EXPIRATION_FILTERS.ALL
                    )
                  }
                  options={[
                    { value: EXPIRATION_FILTERS.ALL, label: "Any expiration" },
                    { value: EXPIRATION_FILTERS.EXPIRED, label: "Expired" },
                    { value: EXPIRATION_FILTERS.SOON, label: "Expiring soon" },
                    { value: EXPIRATION_FILTERS.NONE, label: "No expiration" },
                  ]}
                />

                <input
                  aria-label="Expiring soon day window"
                  type="number"
                  min={1}
                  value={expDays}
                  onChange={(event) =>
                    onExpDaysChange(toPositiveInteger(event.target.value, 7))
                  }
                  className={`min-h-14 rounded-xl border border-stocksense-gray px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)] ${
                    expirationFilter !== EXPIRATION_FILTERS.SOON
                      ? "bg-gray-100 text-gray-400"
                      : "bg-white text-gray-800"
                  }`}
                  disabled={expirationFilter !== EXPIRATION_FILTERS.SOON}
                />
              </div>

              <NativeSelect
                aria-label="Filter by stock"
                label="Stock"
                value={stockFilter}
                onChange={(value) =>
                  onStockFilterChange(value || STOCK_FILTERS.ALL)
                }
                options={[
                  { value: STOCK_FILTERS.ALL, label: "Any stock" },
                  { value: STOCK_FILTERS.IN_STOCK, label: "In stock" },
                  { value: STOCK_FILTERS.LOW_OR_EMPTY, label: "Low or empty" },
                ]}
              />

              <NativeSelect
                aria-label="Sort items"
                label="Sort by"
                value={sortBy}
                onChange={(value) => onSortChange(value || SORT_OPTIONS.NAME_ASC)}
                options={Object.entries(sortLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </ModalBody>

            <ModalFooter className="wherekeep-modal-footer sticky bottom-0 z-20 border-t border-gray-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_24px_rgb(15_23_42_/_0.08)]">
              <NativeButton
                className="min-h-12 w-full rounded-xl bg-[var(--stocksense-brand)] text-base font-semibold text-white"
                onPress={() => onOpenChange(false)}
              >
                Apply filters
              </NativeButton>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

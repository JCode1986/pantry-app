"use client";

import NativeButton from "@/components/ui/NativeButton";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@/components/ui/NativeModal";
import {
  FaBarcode,
  FaBoxOpen,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
import NativeDropdown from "@/components/ui/NativeDropdown";
import SearchResultsLoadingState from "@/components/ui/SearchResultsLoadingState";
import { daysUntil, isExpiringSoon } from "@/utils/pantry/date";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalHeaderClass,
  modalSubtitleClass,
  modalTitleClass,
} from "@/components/modals/modalTheme";

export default function StorageMobileCategorySheet({
  activeMobileCategory,
  setMobileCategorySheet,
  locationName,
  canEditInventory,
  activeMobileSelectionContext,
  clearSelectedItems,
  selectVisibleItemsInCategory,
  openMoveModal,
  openDeleteDialog,
  openCreateItemModal,
  openEditCategoryModal,
  loadCategoryItems,
  expDays,
  selectedByCategory,
  toggleSelectItem,
  openEditItemModal,
}) {
  return (
    <Modal
      isOpen={Boolean(activeMobileCategory)}
      onOpenChange={(open) => {
        if (!open) setMobileCategorySheet(null);
      }}
      placement="bottom"
      scrollBehavior="inside"
      size="full"
      classNames={{
        wrapper: "items-end max-md:overflow-hidden max-md:p-0 max-md:pt-4",
      }}
    >
      <ModalContent
        className={`${modalContentClass} max-h-[88svh] max-md:h-[calc(100svh-1rem)] max-md:max-h-[calc(100svh-1rem)] max-md:rounded-b-none max-md:rounded-t-3xl sm:rounded-2xl`}
        style={{
          ...modalContentStyle,
          "--wherekeep-mobile-sheet-height": "calc(100svh - 1rem)",
        }}
      >
        {() => (
          <>
            <ModalHeader className={`flex items-center gap-2 ${modalHeaderClass}`}>
              <span className="min-w-0 flex-1">
                <span className={`block ${modalTitleClass}`}>
                  {activeMobileCategory?.category?.name || "Category"}
                </span>
                <span className={`block ${modalSubtitleClass}`}>
                  {activeMobileCategory?.area?.name} | {locationName}
                </span>
              </span>
              <MobileSheetCloseButton onPress={() => setMobileCategorySheet(null)} />
            </ModalHeader>

            <ModalBody className={`space-y-3 ${modalBodyClass}`}>
              {canEditInventory && activeMobileCategory && (
                <>
                  {activeMobileSelectionContext ? (
                    <div
                      key="location-mobile-category-selection"
                      className="sticky top-3 z-[60] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                            {activeMobileSelectionContext.itemIds.length} selected
                          </h2>
                          <p className="mt-0.5 text-xs text-gray-500">
                            Tap cards to adjust selection.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearSelectedItems}
                          className="min-h-10 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            selectVisibleItemsInCategory(
                              activeMobileSelectionContext.category.id,
                              activeMobileSelectionContext.visibleItems
                            )
                          }
                          disabled={activeMobileSelectionContext.visibleItems.length === 0}
                          className="min-h-11 rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-sm font-semibold text-[var(--stocksense-brand)] disabled:opacity-50"
                        >
                          {activeMobileSelectionContext.allVisibleSelected
                            ? "Deselect visible"
                            : "Select visible"}
                        </button>
                        <span className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-500">
                          {activeMobileSelectionContext.visibleItems.length} visible
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <NativeButton
                          className="min-h-11 rounded-xl bg-[var(--stocksense-brand)] text-sm font-semibold text-white"
                          onPress={() =>
                            openMoveModal(
                              activeMobileSelectionContext.area.id,
                              activeMobileSelectionContext.category.id
                            )
                          }
                          isDisabled={activeMobileSelectionContext.itemIds.length === 0}
                        >
                          Move
                        </NativeButton>
                        <NativeButton
                          className="min-h-11 rounded-xl bg-rose-600 text-sm font-semibold text-white"
                          onPress={() =>
                            openDeleteDialog("bulk-items", {
                              itemIds: activeMobileSelectionContext.itemIds,
                              categoryId: activeMobileSelectionContext.category.id,
                              storageAreaId: activeMobileSelectionContext.area.id,
                              categoryName: activeMobileSelectionContext.category.name,
                              areaName: activeMobileSelectionContext.area.name,
                              count: activeMobileSelectionContext.itemIds.length,
                            })
                          }
                          isDisabled={activeMobileSelectionContext.itemIds.length === 0}
                        >
                          Delete
                        </NativeButton>
                      </div>
                    </div>
                  ) : (
                    <div
                      key="location-mobile-category-default"
                      className="grid grid-cols-2 gap-2"
                    >
                      <button
                        onClick={() => {
                          openCreateItemModal(
                            activeMobileCategory.area,
                            activeMobileCategory.category
                          );
                        }}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-3 text-sm font-medium text-white"
                      >
                        <FaBoxOpen /> Add item
                      </button>
                      <button
                        onClick={() =>
                          openEditCategoryModal(
                            activeMobileCategory.area,
                            activeMobileCategory.category
                          )
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-700"
                      >
                        <FaEdit /> Edit category
                      </button>
                    </div>
                  )}
                </>
              )}

              {activeMobileCategory?.category?.itemsLoading ? (
                <SearchResultsLoadingState
                  label="Loading items"
                  detail="Fetching this category."
                  className="rounded-2xl border border-dashed border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/25 px-5 py-6"
                />
              ) : activeMobileCategory?.category?.itemsError ? (
                <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center text-sm text-rose-700">
                  <p>{activeMobileCategory.category.itemsError}</p>
                  <NativeButton
                    size="sm"
                    color="danger"
                    variant="flat"
                    className="rounded-xl"
                    onPress={() =>
                      loadCategoryItems(activeMobileCategory.category.id, {
                        force: true,
                      })
                    }
                  >
                    Retry
                  </NativeButton>
                </div>
              ) : activeMobileCategory?.items?.length ? (
                activeMobileCategory.items.map((item) => {
                  const soon = isExpiringSoon(item.expiration_date, expDays);
                  const selected = Boolean(
                    selectedByCategory[activeMobileCategory.category.id]?.[item.id]
                  );

                  return (
                    <div
                      key={item.id}
                      role={activeMobileSelectionContext ? "button" : undefined}
                      tabIndex={activeMobileSelectionContext ? 0 : undefined}
                      onClick={
                        activeMobileSelectionContext
                          ? () =>
                              toggleSelectItem(
                                activeMobileCategory.category.id,
                                item.id
                              )
                          : undefined
                      }
                      onKeyDown={
                        activeMobileSelectionContext
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleSelectItem(
                                  activeMobileCategory.category.id,
                                  item.id
                                );
                              }
                            }
                          : undefined
                      }
                      className={`rounded-2xl border bg-white p-3 shadow-sm ${
                        selected
                          ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                          : "border-gray-100"
                      } ${
                        activeMobileSelectionContext
                          ? "cursor-pointer transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--stocksense-brand-border)]"
                          : ""
                      }`}
                    >
                      <div className="flex min-w-0 gap-3">
                        {item.imageUrl ? (
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                            <ImageWithLoader
                              src={item.imageThumbUrl || item.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--entity-item-border)] bg-[var(--entity-item-soft)] text-[var(--entity-item-accent)]">
                            <FaBoxOpen className="h-4 w-4" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {item.name}
                            </p>
                            {soon && (
                              <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-700">
                                {daysUntil(item.expiration_date) < 0
                                  ? "Expired"
                                  : "Soon"}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                            <span>Qty: {item.quantity}</span>
                            <span>Exp: {item.expiration_date || "-"}</span>
                            {item.barcode && (
                              <span className="inline-flex min-w-0 items-center gap-1 text-xs">
                                <FaBarcode className="h-3 w-3" />
                                <span className="truncate">{item.barcode}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {canEditInventory && activeMobileCategory && (
                          <div
                            className="shrink-0"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <NativeDropdown
                              ariaLabel={`${item.name} actions`}
                              items={[
                                {
                                  key: "select",
                                  label: selected
                                    ? "Deselect for bulk action"
                                    : "Select for bulk action",
                                  onSelect: () =>
                                    toggleSelectItem(
                                      activeMobileCategory.category.id,
                                      item.id
                                    ),
                                },
                                {
                                  key: "edit",
                                  label: "Edit Item",
                                  onSelect: () =>
                                    openEditItemModal(
                                      activeMobileCategory.area,
                                      activeMobileCategory.category,
                                      item
                                    ),
                                },
                                {
                                  key: "move",
                                  label: "Move Item",
                                  onSelect: () =>
                                    openMoveModal(
                                      activeMobileCategory.area.id,
                                      activeMobileCategory.category.id,
                                      item.id
                                    ),
                                },
                                {
                                  key: "delete",
                                  label: "Delete Item",
                                  danger: true,
                                  onSelect: () =>
                                    openDeleteDialog("item", {
                                      itemId: item.id,
                                      itemName: item.name,
                                      categoryId: activeMobileCategory.category.id,
                                      storageAreaId: activeMobileCategory.area.id,
                                      categoryName: activeMobileCategory.category.name,
                                      areaName: activeMobileCategory.area.name,
                                    }),
                                },
                              ]}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  No items in this category yet.
                </div>
              )}

              {canEditInventory && activeMobileCategory && (
                <button
                  onClick={() => {
                    setMobileCategorySheet(null);
                    openDeleteDialog("category", {
                      categoryId: activeMobileCategory.category.id,
                      storageAreaId: activeMobileCategory.area.id,
                      name: activeMobileCategory.category.name,
                      areaName: activeMobileCategory.area.name,
                    });
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-base font-semibold text-rose-700"
                >
                  <FaTrash /> Delete category
                </button>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

"use client";

import NativeInput from "@/components/ui/NativeInput";
import NativeButton from "@/components/ui/NativeButton";
import Link from "next/link";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
import { FaShoppingBasket } from "react-icons/fa";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  modalSubtitleClass,
  modalTitleClass,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";
import NativeSelect from "@/components/ui/NativeSelect";

const NEW_LOCATION_VALUE = "__new_location__";
const NEW_AREA_VALUE = "__new_area__";
const NEW_CATEGORY_VALUE = "__new_category__";

export default function ItemsMoveModal({
  isOpen,
  onOpenChange,
  selectedCount,
  drawerOpen,
  activeItem,
  selectedIds,
  moveTarget,
  setMoveTarget,
  locationOptions,
  currentAreas,
  currentCategories,
  isLoadingHierarchy,
  hierarchyError,
  onRetryLoadHierarchy,
  moveCreateMessage,
  moveCreateNames,
  moveCreateAction,
  onMoveCreateNameChange,
  onCreateMoveLocation,
  onCreateMoveArea,
  onCreateMoveCategory,
  shoppingListMoveAction,
  canConfirmMove,
  onMoveToShoppingList,
  onConfirmMoveSingle,
  onConfirmMoveBulk,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      placement="center"
      scrollBehavior="inside"
      classNames={mobileSheetModalClassNames}
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {() => (
          <>
            <ModalHeader className={`flex items-center gap-3 ${modalHeaderClass}`}>
              <div className="min-w-0 flex-1">
                <div className={modalTitleClass}>
                  Move {selectedCount > 0 && !drawerOpen ? `${selectedCount} items` : "item"}
                </div>
                <div className={modalSubtitleClass}>
                  Choose the destination category.
                </div>
              </div>
              <MobileSheetCloseButton onPress={() => onOpenChange(false)} />
            </ModalHeader>

            <ModalBody className={`space-y-4 ${modalBodyClass}`}>
              {moveCreateMessage ? (
                <div
                  className={`rounded-2xl border px-3 py-2 text-sm ${
                    moveCreateMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {moveCreateMessage.text}
                </div>
              ) : null}

              {drawerOpen && activeItem ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-3">
                  <p className="text-xs font-medium uppercase text-gray-500">Current</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-gray-950">
                    {activeItem.location?.id ? (
                      <Link
                        href={`/locations/${activeItem.location.id}`}
                        className="hover:text-[var(--stocksense-brand)]"
                      >
                        {activeItem.location.name || "Unknown location"}
                      </Link>
                    ) : (
                      <span>{activeItem.location?.name || "Unknown location"}</span>
                    )}
                    <span className="text-gray-300">/</span>
                    {activeItem.area?.id ? (
                      <Link
                        href={`/areas/${activeItem.area.id}`}
                        className="hover:text-[var(--stocksense-brand)]"
                      >
                        {activeItem.area.name || "Storage area"}
                      </Link>
                    ) : (
                      <span>{activeItem.area?.name || "Storage area"}</span>
                    )}
                    <span className="text-gray-300">/</span>
                    {activeItem.category?.id ? (
                      <Link
                        href={`/categories/${activeItem.category.id}`}
                        className="hover:text-[var(--stocksense-brand)]"
                      >
                        {activeItem.category.name || "Category"}
                      </Link>
                    ) : (
                      <span>{activeItem.category?.name || "Category"}</span>
                    )}
                  </p>
                </div>
              ) : null}

              {isLoadingHierarchy ? (
                <div className="rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)]/40 px-3 py-2 text-sm font-medium text-[var(--stocksense-brand)]">
                  Loading move destinations...
                </div>
              ) : null}
              {hierarchyError ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
                  <span>{hierarchyError}</span>
                  <NativeButton
                    size="sm"
                    color="danger"
                    variant="flat"
                    className="rounded-xl"
                    onPress={onRetryLoadHierarchy}
                  >
                    Retry
                  </NativeButton>
                </div>
              ) : null}

              <NativeSelect
                label="Location"
                aria-label="Move location"
                value={moveTarget.locationId ? String(moveTarget.locationId) : ""}
                onChange={(value) => {
                  const locId = value || null;
                  if (locId === NEW_LOCATION_VALUE) {
                    setMoveTarget({
                      locationId: NEW_LOCATION_VALUE,
                      areaId: null,
                      categoryId: null,
                    });
                    return;
                  }

                  const loc =
                    locationOptions.find((l) => String(l.id) === String(locId)) ||
                    locationOptions[0];
                  const firstArea = loc?.storage_areas?.[0] || null;
                  const firstCat = firstArea?.categories?.[0] || null;

                  setMoveTarget({
                    locationId: loc?.id ?? null,
                    areaId: firstArea?.id ?? null,
                    categoryId: firstCat?.id ?? null,
                  });
                }}
                disabled={isLoadingHierarchy}
                placeholder="Select location"
                options={[
                  ...locationOptions.map((location) => ({
                    value: String(location.id),
                    label: location.name,
                  })),
                  { value: NEW_LOCATION_VALUE, label: "+ New location" },
                ]}
              />
              {moveTarget.locationId === NEW_LOCATION_VALUE ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <NativeInput
                    label="New location"
                    value={moveCreateNames.location}
                    onValueChange={(value) => onMoveCreateNameChange("location", value)}
                    placeholder="Kitchen, garage, closet..."
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <NativeButton
                    className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                    isLoading={moveCreateAction === "location"}
                    isDisabled={
                      !moveCreateNames.location.trim() || Boolean(moveCreateAction)
                    }
                    onPress={onCreateMoveLocation}
                  >
                    Create
                  </NativeButton>
                </div>
              ) : null}

              <NativeSelect
                label="Storage area"
                placeholder="Select area..."
                aria-label="Move storage area"
                value={moveTarget.areaId ? String(moveTarget.areaId) : ""}
                onChange={(value) => {
                  const areaId = value || null;
                  if (areaId === NEW_AREA_VALUE) {
                    setMoveTarget((prev) => ({
                      ...prev,
                      areaId: NEW_AREA_VALUE,
                      categoryId: null,
                    }));
                    return;
                  }

                  const area =
                    currentAreas.find((a) => String(a.id) === String(areaId)) ||
                    currentAreas[0];
                  const firstCat = area?.categories?.[0] || null;

                  setMoveTarget((prev) => ({
                    ...prev,
                    areaId: area?.id ?? null,
                    categoryId: firstCat?.id ?? null,
                  }));
                }}
                disabled={
                  isLoadingHierarchy ||
                  !moveTarget.locationId ||
                  moveTarget.locationId === NEW_LOCATION_VALUE
                }
                options={[
                  ...currentAreas.map((area) => ({
                    value: String(area.id),
                    label: area.name,
                  })),
                  { value: NEW_AREA_VALUE, label: "+ New storage area" },
                ]}
              />
              {moveTarget.areaId === NEW_AREA_VALUE ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <NativeInput
                    label="New storage area"
                    value={moveCreateNames.area}
                    onValueChange={(value) => onMoveCreateNameChange("area", value)}
                    placeholder="Pantry, shelf, drawer..."
                    isDisabled={
                      isLoadingHierarchy ||
                      !moveTarget.locationId ||
                      moveTarget.locationId === NEW_LOCATION_VALUE
                    }
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <NativeButton
                    className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                    isLoading={moveCreateAction === "area"}
                    isDisabled={
                      !moveCreateNames.area.trim() ||
                      !moveTarget.locationId ||
                      moveTarget.locationId === NEW_LOCATION_VALUE ||
                      Boolean(moveCreateAction)
                    }
                    onPress={onCreateMoveArea}
                  >
                    Create
                  </NativeButton>
                </div>
              ) : null}

              <NativeSelect
                label="Category"
                placeholder="Select category..."
                aria-label="Move category"
                value={moveTarget.categoryId ? String(moveTarget.categoryId) : ""}
                onChange={(value) =>
                  setMoveTarget((prev) => ({
                    ...prev,
                    categoryId: value || null,
                  }))
                }
                disabled={
                  isLoadingHierarchy ||
                  !moveTarget.areaId ||
                  moveTarget.areaId === NEW_AREA_VALUE
                }
                options={[
                  ...currentCategories.map((category) => ({
                    value: String(category.id),
                    label: category.name,
                  })),
                  { value: NEW_CATEGORY_VALUE, label: "+ New category" },
                ]}
              />
              {moveTarget.categoryId === NEW_CATEGORY_VALUE ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <NativeInput
                    label="New category"
                    value={moveCreateNames.category}
                    onValueChange={(value) => onMoveCreateNameChange("category", value)}
                    placeholder="Snacks, tools, cleaning..."
                    isDisabled={
                      isLoadingHierarchy ||
                      !moveTarget.areaId ||
                      moveTarget.areaId === NEW_AREA_VALUE
                    }
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <NativeButton
                    className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                    isLoading={moveCreateAction === "category"}
                    isDisabled={
                      !moveCreateNames.category.trim() ||
                      !moveTarget.areaId ||
                      moveTarget.areaId === NEW_AREA_VALUE ||
                      Boolean(moveCreateAction)
                    }
                    onPress={onCreateMoveCategory}
                  >
                    Create
                  </NativeButton>
                </div>
              ) : null}
            </ModalBody>

            <ModalFooter className={modalFooterClass}>
              <NativeButton
                variant="light"
                className="rounded-xl max-md:hidden"
                onPress={() => onOpenChange(false)}
                isDisabled={Boolean(shoppingListMoveAction)}
              >
                Cancel
              </NativeButton>
              <NativeButton
                className="rounded-xl border border-[var(--entity-shopping-border)] bg-white text-[var(--entity-shopping-accent)]"
                onPress={onMoveToShoppingList}
                isLoading={Boolean(shoppingListMoveAction)}
                isDisabled={
                  Boolean(shoppingListMoveAction) ||
                  (!drawerOpen && selectedIds.size === 0) ||
                  (drawerOpen && !activeItem)
                }
                startContent={!shoppingListMoveAction ? <FaShoppingBasket /> : null}
              >
                Move to shopping list
              </NativeButton>
              <NativeButton
                className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                onPress={() => {
                  if (selectedIds.size > 0 && !drawerOpen) onConfirmMoveBulk();
                  else onConfirmMoveSingle();
                }}
                isDisabled={
                  isLoadingHierarchy || !canConfirmMove || Boolean(shoppingListMoveAction)
                }
              >
                Move
              </NativeButton>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

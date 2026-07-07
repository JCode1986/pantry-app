"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Select, SelectItem } from "@heroui/react";
import {
  modalContentStyle,
  themedSelectClassNames,
} from "@/components/modals/modalTheme";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";

function createClosedMoveModal(currentLocationId) {
  return {
    open: false,
    sourceAreaId: null,
    sourceCategoryId: null,
    targetLocationId: currentLocationId,
    targetAreaId: null,
    targetCategoryId: null,
    itemIds: [],
  };
}

export default function MoveItemsModal({
  moveModal,
  setMoveModal,
  locationsForMove,
  storageAreas,
  currentLocationId,
  onConfirm,
}) {
  const safeLocations = locationsForMove ?? [];

  const selectedLocation = useMemo(() => {
    return (
      safeLocations.find(
        (loc) => String(loc.id) === String(moveModal.targetLocationId)
      ) ?? safeLocations[0] ?? null
    );
  }, [safeLocations, moveModal.targetLocationId]);

  const areasForSelectedLocation = useMemo(() => {
    if (!selectedLocation) return [];
    return String(selectedLocation.id) === String(currentLocationId)
      ? storageAreas ?? []
      : selectedLocation.storageAreas ?? [];
  }, [currentLocationId, selectedLocation, storageAreas]);

  const selectedArea = useMemo(() => {
    return (
      areasForSelectedLocation.find(
        (area) => String(area.id) === String(moveModal.targetAreaId)
      ) ?? null
    );
  }, [areasForSelectedLocation, moveModal.targetAreaId]);

  const currentPath = useMemo(() => {
    const sourceArea = (storageAreas ?? []).find(
      (area) => String(area.id) === String(moveModal.sourceAreaId)
    );
    const sourceCategory = sourceArea?.categories?.find(
      (category) => String(category.id) === String(moveModal.sourceCategoryId)
    );
    const currentLocation =
      safeLocations.find((location) => String(location.id) === String(currentLocationId)) ??
      null;

    return [currentLocation?.name, sourceArea?.name, sourceCategory?.name]
      .filter(Boolean)
      .join(" > ");
  }, [
    currentLocationId,
    moveModal.sourceAreaId,
    moveModal.sourceCategoryId,
    safeLocations,
    storageAreas,
  ]);

  const canMove =
    Boolean(moveModal.targetAreaId && moveModal.targetCategoryId) &&
    String(moveModal.targetCategoryId) !== String(moveModal.sourceCategoryId);

  const closeModal = () => {
    setMoveModal(createClosedMoveModal(currentLocationId));
  };

  const handleLocationChange = (value) => {
    const nextLocation =
      safeLocations.find((loc) => String(loc.id) === String(value)) ??
      safeLocations[0] ??
      null;

    const nextAreas =
      nextLocation && String(nextLocation.id) === String(currentLocationId)
        ? storageAreas ?? []
        : nextLocation?.storageAreas ?? [];

    const firstArea = nextAreas[0] ?? null;
    const firstCategory = firstArea?.categories?.[0] ?? null;

    setMoveModal((prev) => ({
      ...prev,
      targetLocationId: nextLocation?.id ?? null,
      targetAreaId: firstArea?.id ?? null,
      targetCategoryId: firstCategory?.id ?? null,
    }));
  };

  const handleAreaChange = (value) => {
    const nextArea =
      areasForSelectedLocation.find((area) => String(area.id) === String(value)) ??
      null;
    const firstCategory = nextArea?.categories?.[0] ?? null;

    setMoveModal((prev) => ({
      ...prev,
      targetAreaId: nextArea?.id ?? null,
      targetCategoryId: firstCategory?.id ?? null,
    }));
  };

  const getSelectedValue = (keys) => {
    const value = Array.from(keys)[0];
    return value ? String(value) : "";
  };

  return (
    <AnimatePresence>
      {moveModal.open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 max-md:items-stretch"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="flex w-full max-w-md flex-col rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-xl max-md:h-[100dvh] max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-gray-50 max-md:shadow-none md:space-y-4 md:p-5"
            style={modalContentStyle}
          >
            <div className="flex shrink-0 gap-3 border-b border-gray-200 bg-white max-md:sticky max-md:top-0 max-md:z-20 max-md:px-4 max-md:py-3 md:block">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-gray-950">
                  Move {moveModal.itemIds.length} item
                  {moveModal.itemIds.length > 1 ? "s" : ""}
                </h2>
                <p className="mt-1 truncate text-sm text-gray-500">
                  Choose where you want to move the selected item
                  {moveModal.itemIds.length > 1 ? "s" : ""}.
                </p>
              </div>
              <MobileSheetCloseButton onPress={closeModal} />
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain max-md:px-4 max-md:py-4">
              {currentPath ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-3">
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Current
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-950">
                    {currentPath}
                  </p>
                </div>
              ) : null}
              <div className="space-y-1">
              <Select
                label="Location"
                selectedKeys={
                  moveModal.targetLocationId
                    ? new Set([String(moveModal.targetLocationId)])
                    : new Set()
                }
                onSelectionChange={(keys) => handleLocationChange(getSelectedValue(keys))}
                variant="bordered"
                radius="lg"
                classNames={themedSelectClassNames}
              >
                {safeLocations.map((location) => (
                  <SelectItem key={String(location.id)}>
                    {location.name}
                  </SelectItem>
                ))}
              </Select>
              </div>

              <div className="space-y-1">
              <Select
                label="Storage area"
                placeholder="Select area..."
                selectedKeys={
                  moveModal.targetAreaId
                    ? new Set([String(moveModal.targetAreaId)])
                    : new Set()
                }
                onSelectionChange={(keys) => handleAreaChange(getSelectedValue(keys))}
                variant="bordered"
                radius="lg"
                classNames={themedSelectClassNames}
              >
                {areasForSelectedLocation.map((area) => (
                  <SelectItem key={String(area.id)}>{area.name}</SelectItem>
                ))}
              </Select>
              </div>

              <div className="space-y-1">
              <Select
                label="Category"
                placeholder="Select category..."
                selectedKeys={
                  moveModal.targetCategoryId
                    ? new Set([String(moveModal.targetCategoryId)])
                    : new Set()
                }
                onSelectionChange={(keys) =>
                  setMoveModal((prev) => ({
                    ...prev,
                    targetCategoryId: getSelectedValue(keys) || null,
                  }))
                }
                isDisabled={!moveModal.targetAreaId}
                variant="bordered"
                radius="lg"
                classNames={themedSelectClassNames}
              >
                {selectedArea?.categories?.map((category) => (
                  <SelectItem key={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </Select>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-white pt-2 max-md:sticky max-md:bottom-0 max-md:z-20 max-md:flex-col-reverse max-md:px-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:pt-3">
              <button
                onClick={closeModal}
                className="min-h-11 cursor-pointer rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 max-md:hidden"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={!canMove}
                className="min-h-11 cursor-pointer rounded-xl bg-[var(--stocksense-brand)] px-3 py-1.5 text-sm text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Move
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

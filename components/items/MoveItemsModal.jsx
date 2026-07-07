"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Select, SelectItem } from "@heroui/react";
import {
  modalContentStyle,
  themedSelectClassNames,
} from "@/components/modals/modalTheme";

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
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 text-gray-700 shadow-xl space-y-4"
            style={modalContentStyle}
          >
            <h2 className="text-lg font-semibold text-gray-950">
              Move {moveModal.itemIds.length} item
              {moveModal.itemIds.length > 1 ? "s" : ""}
            </h2>
            <p className="text-sm text-gray-500">
              Choose where you want to move the selected item
              {moveModal.itemIds.length > 1 ? "s" : ""}.
            </p>

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

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeModal}
                className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={!canMove}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--stocksense-brand)] text-white hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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

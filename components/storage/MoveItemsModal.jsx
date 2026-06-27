"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
            className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-stocksense-gray p-5 space-y-4"
          >
            <h2 className="text-lg font-semibold text-stocksense-teal">
              Move {moveModal.itemIds.length} item
              {moveModal.itemIds.length > 1 ? "s" : ""}
            </h2>
            <p className="text-sm text-gray-500">
              Choose where you want to move the selected item
              {moveModal.itemIds.length > 1 ? "s" : ""}.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Location</label>
              <select
                value={
                  moveModal.targetLocationId
                    ? String(moveModal.targetLocationId)
                    : ""
                }
                onChange={(event) => handleLocationChange(event.target.value)}
                className="w-full rounded-lg border border-stocksense-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
              >
                {safeLocations.map((location) => (
                  <option key={location.id} value={String(location.id)}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">
                Storage area
              </label>
              <select
                value={moveModal.targetAreaId ? String(moveModal.targetAreaId) : ""}
                onChange={(event) => handleAreaChange(event.target.value)}
                className="w-full rounded-lg border border-stocksense-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50"
              >
                <option value="">Select area...</option>
                {areasForSelectedLocation.map((area) => (
                  <option key={area.id} value={String(area.id)}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">
                Category
              </label>
              <select
                value={
                  moveModal.targetCategoryId
                    ? String(moveModal.targetCategoryId)
                    : ""
                }
                onChange={(event) =>
                  setMoveModal((prev) => ({
                    ...prev,
                    targetCategoryId: event.target.value || null,
                  }))
                }
                disabled={!moveModal.targetAreaId}
                className="w-full rounded-lg border border-stocksense-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9FE7D7]/50 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">Select category...</option>
                {selectedArea?.categories?.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeModal}
                className="px-3 py-1.5 text-sm rounded-lg border border-stocksense-gray hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={!moveModal.targetAreaId || !moveModal.targetCategoryId}
                className="px-3 py-1.5 text-sm rounded-lg bg-[#0E7488] text-white hover:bg-[#0B5563] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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

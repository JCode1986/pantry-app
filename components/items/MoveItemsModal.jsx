"use client";

import { useMemo } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  modalBodyClass,
  modalContentStyle,
  modalContentClass,
  modalFooterClass,
  modalHeaderClass,
  mobileSheetModalClassNames,
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
    <Modal
      isOpen={moveModal.open}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
      size="md"
      placement="center"
      scrollBehavior="inside"
      classNames={mobileSheetModalClassNames}
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {() => (
          <>
            <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-semibold text-[var(--stocksense-brand)]">
                  Move {moveModal.itemIds.length} item
                  {moveModal.itemIds.length > 1 ? "s" : ""}
                </div>
                <div className="truncate text-sm text-gray-500">
                  Choose where you want to move the selected item
                  {moveModal.itemIds.length > 1 ? "s" : ""}.
                </div>
              </div>
              <MobileSheetCloseButton onPress={closeModal} />
            </ModalHeader>

            <ModalBody className={`space-y-4 ${modalBodyClass}`}>
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
            </ModalBody>

            <ModalFooter className={modalFooterClass}>
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
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

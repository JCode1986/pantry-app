"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
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
  modalInputClassNames,
  mobileSheetModalClassNames,
  themedSelectClassNames,
} from "@/components/modals/modalTheme";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import {
  addCategory,
  addLocation,
  addStorageArea,
} from "@/app/actions/server";

const NEW_LOCATION_VALUE = "__new_location__";
const NEW_AREA_VALUE = "__new_area__";
const NEW_CATEGORY_VALUE = "__new_category__";

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
  onDestinationCreated,
}) {
  const [localLocations, setLocalLocations] = useState([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState("");
  const [createMessage, setCreateMessage] = useState(null);

  useEffect(() => {
    setLocalLocations(
      (locationsForMove ?? []).map((location) => ({
        ...location,
        storageAreas: location.storageAreas ?? location.storage_areas ?? [],
      }))
    );
  }, [locationsForMove]);

  const safeLocations = localLocations;

  const selectedLocation = useMemo(() => {
    if (moveModal.targetLocationId === NEW_LOCATION_VALUE) return null;

    return (
      safeLocations.find(
        (loc) => String(loc.id) === String(moveModal.targetLocationId)
      ) ?? safeLocations[0] ?? null
    );
  }, [safeLocations, moveModal.targetLocationId]);

  const areasForSelectedLocation = useMemo(() => {
    if (!selectedLocation) return [];
    if (String(selectedLocation.id) !== String(currentLocationId)) {
      return selectedLocation.storageAreas ?? [];
    }

    const byId = new Map();
    for (const area of storageAreas ?? []) {
      byId.set(String(area.id), area);
    }
    for (const area of selectedLocation.storageAreas ?? []) {
      byId.set(String(area.id), area);
    }

    return Array.from(byId.values());
  }, [currentLocationId, selectedLocation, storageAreas]);

  const selectedArea = useMemo(() => {
    if (moveModal.targetAreaId === NEW_AREA_VALUE) return null;

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
    Boolean(
      moveModal.targetAreaId &&
        moveModal.targetAreaId !== NEW_AREA_VALUE &&
        moveModal.targetCategoryId &&
        moveModal.targetCategoryId !== NEW_CATEGORY_VALUE
    ) &&
    String(moveModal.targetCategoryId) !== String(moveModal.sourceCategoryId);

  const closeModal = () => {
    setNewLocationName("");
    setNewAreaName("");
    setNewCategoryName("");
    setCreateMessage(null);
    setCreating("");
    setMoveModal(createClosedMoveModal(currentLocationId));
  };

  const handleLocationChange = (value) => {
    if (value === NEW_LOCATION_VALUE) {
      setMoveModal((prev) => ({
        ...prev,
        targetLocationId: NEW_LOCATION_VALUE,
        targetAreaId: null,
        targetCategoryId: null,
      }));
      return;
    }

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
    if (value === NEW_AREA_VALUE) {
      setMoveModal((prev) => ({
        ...prev,
        targetAreaId: NEW_AREA_VALUE,
        targetCategoryId: null,
      }));
      return;
    }

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

  const showCreateMessage = (type, text) => {
    setCreateMessage({ type, text });
    window.setTimeout(() => setCreateMessage(null), 3500);
  };

  const createLocation = async () => {
    const name = newLocationName.trim();
    if (!name || creating) return;

    setCreating("location");
    setCreateMessage(null);
    const result = await addLocation(name);
    setCreating("");

    if (result?.error) {
      showCreateMessage("error", result.error?.message || result.error);
      return;
    }

    const location = { ...result.data, storageAreas: [] };
    setLocalLocations((current) => [...current, location]);
    setMoveModal((prev) => ({
      ...prev,
      targetLocationId: location.id,
      targetAreaId: null,
      targetCategoryId: null,
    }));
    setNewLocationName("");
    onDestinationCreated?.({ type: "location", location });
    showCreateMessage("success", "Location created.");
  };

  const createStorageArea = async () => {
    const name = newAreaName.trim();
    const locationId = moveModal.targetLocationId;
    if (!name || !locationId || locationId === NEW_LOCATION_VALUE || creating) return;

    setCreating("area");
    setCreateMessage(null);
    const result = await addStorageArea(locationId, name);
    setCreating("");

    if (result?.error) {
      showCreateMessage("error", result.error?.message || result.error);
      return;
    }

    const area = { ...result.data, categories: [] };
    setLocalLocations((current) =>
      current.map((location) =>
        String(location.id) === String(locationId)
          ? {
              ...location,
              storageAreas: [...(location.storageAreas ?? []), area],
            }
          : location
      )
    );
    setMoveModal((prev) => ({
      ...prev,
      targetAreaId: area.id,
      targetCategoryId: null,
    }));
    setNewAreaName("");
    onDestinationCreated?.({ type: "area", locationId, area });
    showCreateMessage("success", "Storage area created.");
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    const areaId = moveModal.targetAreaId;
    if (!name || !areaId || areaId === NEW_AREA_VALUE || creating) return;

    setCreating("category");
    setCreateMessage(null);
    const result = await addCategory(areaId, name);
    setCreating("");

    if (result?.error) {
      showCreateMessage("error", result.error?.message || result.error);
      return;
    }

    const category = result.data;
    setLocalLocations((current) =>
      current.map((location) => {
        if (String(location.id) !== String(moveModal.targetLocationId)) {
          return location;
        }

        let foundArea = false;
        const storageAreas = (location.storageAreas ?? []).map((area) => {
          if (String(area.id) !== String(areaId)) return area;

          foundArea = true;
          return {
            ...area,
            categories: [...(area.categories ?? []), category],
          };
        });

        return {
          ...location,
          storageAreas: foundArea
            ? storageAreas
            : [
                ...storageAreas,
                {
                  ...(selectedArea ?? { id: areaId, name: "Storage area" }),
                  categories: [...(selectedArea?.categories ?? []), category],
                },
              ],
        };
      })
    );
    setMoveModal((prev) => ({
      ...prev,
      targetCategoryId: category.id,
    }));
    setNewCategoryName("");
    onDestinationCreated?.({
      type: "category",
      locationId: moveModal.targetLocationId,
      areaId,
      category,
    });
    showCreateMessage("success", "Category created.");
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
              {createMessage ? (
                <div
                  className={`rounded-2xl border px-3 py-2 text-sm ${
                    createMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {createMessage.text}
                </div>
              ) : null}

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
                  <SelectItem key={NEW_LOCATION_VALUE}>+ New location</SelectItem>
                </Select>
                {moveModal.targetLocationId === NEW_LOCATION_VALUE ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      label="New location"
                      value={newLocationName}
                      onValueChange={setNewLocationName}
                      placeholder="Kitchen, garage, closet..."
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                    />
                    <Button
                      className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                      isLoading={creating === "location"}
                      isDisabled={!newLocationName.trim() || Boolean(creating)}
                      onPress={createLocation}
                    >
                      Create
                    </Button>
                  </div>
                ) : null}
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
                  isDisabled={
                    !moveModal.targetLocationId ||
                    moveModal.targetLocationId === NEW_LOCATION_VALUE
                  }
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  {areasForSelectedLocation.map((area) => (
                    <SelectItem key={String(area.id)}>{area.name}</SelectItem>
                  ))}
                  <SelectItem key={NEW_AREA_VALUE}>+ New storage area</SelectItem>
                </Select>
                {moveModal.targetAreaId === NEW_AREA_VALUE ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      label="New storage area"
                      value={newAreaName}
                      onValueChange={setNewAreaName}
                      placeholder="Pantry, shelf, drawer..."
                      isDisabled={
                        !moveModal.targetLocationId ||
                        moveModal.targetLocationId === NEW_LOCATION_VALUE
                      }
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                    />
                    <Button
                      className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                      isLoading={creating === "area"}
                      isDisabled={
                        !newAreaName.trim() ||
                        !moveModal.targetLocationId ||
                        moveModal.targetLocationId === NEW_LOCATION_VALUE ||
                        Boolean(creating)
                      }
                      onPress={createStorageArea}
                    >
                      Create
                    </Button>
                  </div>
                ) : null}
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
                  isDisabled={
                    !moveModal.targetAreaId ||
                    moveModal.targetAreaId === NEW_AREA_VALUE
                  }
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  {selectedArea?.categories?.map((category) => (
                    <SelectItem key={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                  <SelectItem key={NEW_CATEGORY_VALUE}>+ New category</SelectItem>
                </Select>
                {moveModal.targetCategoryId === NEW_CATEGORY_VALUE ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      label="New category"
                      value={newCategoryName}
                      onValueChange={setNewCategoryName}
                      placeholder="Snacks, tools, cleaning..."
                      isDisabled={
                        !moveModal.targetAreaId ||
                        moveModal.targetAreaId === NEW_AREA_VALUE
                      }
                      variant="bordered"
                      radius="lg"
                      classNames={modalInputClassNames}
                    />
                    <Button
                      className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                      isLoading={creating === "category"}
                      isDisabled={
                        !newCategoryName.trim() ||
                        !moveModal.targetAreaId ||
                        moveModal.targetAreaId === NEW_AREA_VALUE ||
                        Boolean(creating)
                      }
                      onPress={createCategory}
                    >
                      Create
                    </Button>
                  </div>
                ) : null}
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

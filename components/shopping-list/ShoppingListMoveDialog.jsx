"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import NativeSelect from "@/components/ui/NativeSelect";

export default function ShoppingListMoveDialog({
  moveDialog,
  closeMoveDialog,
  moveCreateMessage,
  safeMoveLocations,
  selectedMoveLocation,
  moveAreas,
  selectedMoveArea,
  moveCreateNames,
  updateMoveCreateName,
  moveCreateAction,
  createMoveLocation,
  createMoveArea,
  createMoveCategory,
  canMoveToInventory,
  confirmMoveToInventory,
  onMoveLocationChange,
  onMoveAreaChange,
  onMoveCategoryChange,
  newLocationValue,
  newAreaValue,
  newCategoryValue,
}) {
  return (
    <Modal
      isOpen={moveDialog.open}
      onOpenChange={(open) => {
        if (!open) closeMoveDialog();
      }}
      hideCloseButton={moveDialog.isMoving}
      isDismissable={!moveDialog.isMoving}
      placement="center"
      size="md"
      scrollBehavior="inside"
      classNames={mobileSheetModalClassNames}
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {() => (
          <>
            <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate">Move to inventory</span>
                {moveDialog.item?.name ? (
                  <span className="block truncate text-sm font-normal text-gray-500">
                    {moveDialog.item.name}
                  </span>
                ) : moveDialog.itemIds?.length > 1 ? (
                  <span className="block truncate text-sm font-normal text-gray-500">
                    {moveDialog.itemIds.length} selected items
                  </span>
                ) : null}
              </span>
              <MobileSheetCloseButton onPress={closeMoveDialog} />
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

              <NativeSelect
                label="Location"
                aria-label="Move location"
                value={moveDialog.locationId ? String(moveDialog.locationId) : ""}
                onChange={(value) => onMoveLocationChange(value || "")}
                disabled={moveDialog.isMoving}
                placeholder="Select location"
                options={[
                  ...safeMoveLocations.map((location) => ({
                    value: String(location.id),
                    label: location.name,
                  })),
                  { value: newLocationValue, label: "+ New location" },
                ]}
              />
              {moveDialog.locationId === newLocationValue ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    label="New location"
                    value={moveCreateNames.location}
                    onValueChange={(value) => updateMoveCreateName("location", value)}
                    placeholder="Kitchen, garage, closet..."
                    isDisabled={moveDialog.isMoving}
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <Button
                    className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                    isLoading={moveCreateAction === "location"}
                    isDisabled={
                      moveDialog.isMoving ||
                      !moveCreateNames.location.trim() ||
                      Boolean(moveCreateAction)
                    }
                    onPress={createMoveLocation}
                  >
                    Create
                  </Button>
                </div>
              ) : null}

              <NativeSelect
                label="Storage area"
                placeholder="Select storage area"
                aria-label="Move storage area"
                value={moveDialog.areaId ? String(moveDialog.areaId) : ""}
                onChange={(value) => onMoveAreaChange(value || "")}
                disabled={
                  moveDialog.isMoving ||
                  !selectedMoveLocation ||
                  moveDialog.locationId === newLocationValue
                }
                options={[
                  ...moveAreas.map((area) => ({
                    value: String(area.id),
                    label: area.name,
                  })),
                  { value: newAreaValue, label: "+ New storage area" },
                ]}
              />
              {moveDialog.areaId === newAreaValue ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    label="New storage area"
                    value={moveCreateNames.area}
                    onValueChange={(value) => updateMoveCreateName("area", value)}
                    placeholder="Pantry, shelf, drawer..."
                    isDisabled={
                      moveDialog.isMoving ||
                      !moveDialog.locationId ||
                      moveDialog.locationId === newLocationValue
                    }
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <Button
                    className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                    isLoading={moveCreateAction === "area"}
                    isDisabled={
                      moveDialog.isMoving ||
                      !moveCreateNames.area.trim() ||
                      !moveDialog.locationId ||
                      moveDialog.locationId === newLocationValue ||
                      Boolean(moveCreateAction)
                    }
                    onPress={createMoveArea}
                  >
                    Create
                  </Button>
                </div>
              ) : null}

              <NativeSelect
                label="Category"
                placeholder="Select category"
                aria-label="Move category"
                value={moveDialog.categoryId ? String(moveDialog.categoryId) : ""}
                onChange={(value) => onMoveCategoryChange(value || "")}
                disabled={
                  moveDialog.isMoving ||
                  !moveDialog.areaId ||
                  moveDialog.areaId === newAreaValue
                }
                options={[
                  ...(selectedMoveArea?.categories ?? []).map((category) => ({
                    value: String(category.id),
                    label: category.name,
                  })),
                  { value: newCategoryValue, label: "+ New category" },
                ]}
              />
              {moveDialog.categoryId === newCategoryValue ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    label="New category"
                    value={moveCreateNames.category}
                    onValueChange={(value) => updateMoveCreateName("category", value)}
                    placeholder="Snacks, tools, cleaning..."
                    isDisabled={
                      moveDialog.isMoving ||
                      !moveDialog.areaId ||
                      moveDialog.areaId === newAreaValue
                    }
                    variant="bordered"
                    radius="lg"
                    classNames={modalInputClassNames}
                  />
                  <Button
                    className="self-end rounded-xl bg-[var(--stocksense-brand)] text-white"
                    isLoading={moveCreateAction === "category"}
                    isDisabled={
                      moveDialog.isMoving ||
                      !moveCreateNames.category.trim() ||
                      !moveDialog.areaId ||
                      moveDialog.areaId === newAreaValue ||
                      Boolean(moveCreateAction)
                    }
                    onPress={createMoveCategory}
                  >
                    Create
                  </Button>
                </div>
              ) : null}
            </ModalBody>

            <ModalFooter className={modalFooterClass}>
              <Button
                variant="light"
                className="rounded-xl max-md:hidden"
                isDisabled={moveDialog.isMoving}
                onPress={closeMoveDialog}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                isLoading={moveDialog.isMoving}
                isDisabled={!canMoveToInventory}
                onPress={confirmMoveToInventory}
              >
                Move
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

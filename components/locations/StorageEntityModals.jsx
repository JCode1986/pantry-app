"use client";

import { useEffect, useMemo } from "react";
import { parseDate } from "@internationalized/date";
import {
  Button,
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { FaCamera, FaImage } from "react-icons/fa";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSuggestionChips from "@/components/modals/MobileSuggestionChips";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import QuantityStepperInput from "@/components/modals/QuantityStepperInput";
import ImageWithLoader from "@/components/ui/ImageWithLoader";

const modalContentStyle = {
  fontFamily: "var(--stocksense-font-family)",
};

const modalContentClass =
  "wherekeep-modal-content flex w-[calc(100vw-1rem)] max-h-[calc(100svh-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-xl sm:w-full max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-gray-50 max-md:shadow-none";

const mobileSheetModalClassNames = {
  wrapper:
    "max-md:items-stretch max-md:justify-stretch max-md:overflow-hidden max-md:p-0",
  base: "max-md:m-0 max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none",
};

const modalHeaderClass =
  "shrink-0 border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-base font-semibold text-[var(--stocksense-brand)] max-md:sticky max-md:top-0 max-md:z-20 max-md:px-4 max-md:py-3";

const modalBodyClass =
  "wherekeep-modal-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pt-5 max-md:px-4 max-md:pb-40 max-md:pt-4";

const modalFooterClass =
  "wherekeep-modal-footer flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white sm:flex-row sm:justify-end max-md:sticky max-md:bottom-0 max-md:z-20 max-md:px-4 max-md:pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+1rem))] max-md:pt-3 max-md:shadow-[0_-12px_24px_rgb(15_23_42_/_0.08)]";

const modalInputClassNames = {
  inputWrapper:
    "border-gray-200 bg-white focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)]",
  label: "text-gray-700",
  input: "text-gray-900 placeholder:text-gray-400",
};

const modalPrimaryButtonClass =
  "bg-[var(--stocksense-brand)] text-white hover:brightness-95";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const STORAGE_AREA_SUGGESTIONS = ["Pantry", "Closet", "Cabinet", "Drawer", "Shelf", "Box"];
const CATEGORY_SUGGESTIONS = ["Food", "Documents", "Tools", "Medicine", "Clothes", "Electronics"];

function validateImageFile(file) {
  if (!file) return "";
  if (!IMAGE_TYPES.has(file.type)) {
    return "Choose a JPG, PNG, WebP, or GIF image.";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "Images must be 5 MB or smaller.";
  }
  return "";
}

function CreateImagePicker({
  label,
  imagePreview,
  imageFile,
  imageMessage,
  onSelect,
  onClear,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 max-md:bg-white">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
          {label}
        </div>
        {imageFile && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
            Ready to upload
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-28 sm:w-40">
          {imagePreview ? (
            <ImageWithLoader
              src={imagePreview}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-gray-400">
              Optional photo
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-semibold text-[var(--stocksense-brand)]">
              <FaImage className="h-3.5 w-3.5" />
              {imageFile ? "Change photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  onSelect(file);
                }}
              />
            </label>
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-semibold text-[var(--stocksense-brand)] sm:hidden">
              <FaCamera className="h-3.5 w-3.5" />
              Take photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  onSelect(file);
                }}
              />
            </label>
            {imageFile && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs leading-5 text-gray-500 max-md:hidden">
            {imageFile ? imageFile.name : "Choose a photo now, or add one later from edit."}
          </p>
          {imageMessage && (
            <p className="text-xs text-[var(--stocksense-brand)]">{imageMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StorageEntityModals({
  areaModal,
  categoryModal,
  itemModal,
  setAreaModal,
  setCategoryModal,
  setItemModal,
  locationName,
  storageAreas,
  onCloseAreaModal,
  onCloseCategoryModal,
  onCloseItemModal,
  onSubmitAreaModal,
  onSubmitCategoryModal,
  onSubmitItemModal,
  onAreaImageChange,
  onCategoryImageChange,
  onItemImageChange,
  onOpenDeleteDialog,
}) {
  const shouldAutoFocus = useMemo(
    () => areaModal.open || categoryModal.open || itemModal.open,
    [areaModal.open, categoryModal.open, itemModal.open]
  );
  const itemModalExpirationDateValue = useMemo(() => {
    if (!itemModal.expirationDate) return null;
    try {
      return parseDate(itemModal.expirationDate);
    } catch {
      return null;
    }
  }, [itemModal.expirationDate]);

  useEffect(() => {
    const previews = [
      areaModal.imagePreview,
      categoryModal.imagePreview,
      itemModal.imagePreview,
    ];

    return () => {
      previews.forEach((preview) => {
        if (preview?.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [areaModal.imagePreview, categoryModal.imagePreview, itemModal.imagePreview]);

  const setCreateImageFile = (setModal, file) => {
    if (!file) return;

    const imageError = validateImageFile(file);
    if (imageError) {
      setModal((prev) => ({ ...prev, imageMessage: imageError }));
      return;
    }

    setModal((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      imageMessage: "",
    }));
  };

  const clearCreateImageFile = (setModal) => {
    setModal((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: null,
      imageMessage: "",
    }));
  };

  return (
    <>
      {areaModal.open && (
        <Modal
          isOpen={areaModal.open}
          onOpenChange={(open) => !open && onCloseAreaModal()}
          placement="center"
          backdrop="blur"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
              <span className="min-w-0 flex-1 truncate">
                {areaModal.mode === "edit"
                  ? `Edit storage area in ${areaModal.locationName || locationName}`
                  : `Create new storage in ${areaModal.locationName || locationName}`}
              </span>
              <Button
                size="sm"
                radius="full"
                onPress={onSubmitAreaModal}
                isDisabled={!areaModal.name.trim()}
                className={`${modalPrimaryButtonClass} h-10 shrink-0 px-4 text-sm font-semibold md:hidden`}
              >
                {areaModal.mode === "edit" ? "Save" : "Create"}
              </Button>
              <MobileSheetCloseButton onPress={onCloseAreaModal} />
            </ModalHeader>
            <ModalBody className={modalBodyClass}>
              <Input
                label="Storage area name"
                value={areaModal.name}
                onValueChange={(name) => setAreaModal((prev) => ({ ...prev, name }))}
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
                autoFocus={shouldAutoFocus}
              />
              {areaModal.mode === "create" && (
                <MobileSuggestionChips
                  suggestions={STORAGE_AREA_SUGGESTIONS}
                  onSelect={(name) => setAreaModal((prev) => ({ ...prev, name }))}
                />
              )}
              {areaModal.mode === "create" && (
                <CreateImagePicker
                  label="Storage area photo optional"
                  imagePreview={areaModal.imagePreview}
                  imageFile={areaModal.imageFile}
                  imageMessage={areaModal.imageMessage}
                  onSelect={(file) => setCreateImageFile(setAreaModal, file)}
                  onClear={() => clearCreateImageFile(setAreaModal)}
                />
              )}
              {areaModal.mode === "edit" && (
                <EntityImageManager
                  entityType="storage_area"
                  entityId={areaModal.areaId}
                  imageUrl={areaModal.imageUrl}
                  label="Storage area photo"
                  onChange={onAreaImageChange}
                />
              )}
              {areaModal.mode === "edit" && (
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <Button
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      onCloseAreaModal();
                      onOpenDeleteDialog("area", {
                        areaId: areaModal.areaId,
                        name: areaModal.name,
                      });
                    }}
                  >
                    Delete storage area
                  </Button>
                </div>
              )}
            </ModalBody>
            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <Button
                variant="light"
                radius="lg"
                onPress={onCloseAreaModal}
                className="max-md:hidden"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                radius="lg"
                onPress={onSubmitAreaModal}
                isDisabled={!areaModal.name.trim()}
                className={`${modalPrimaryButtonClass} max-md:hidden`}
              >
                {areaModal.mode === "edit" ? "Save changes" : "Add area"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {categoryModal.open && (
        <Modal
          isOpen={categoryModal.open}
          onOpenChange={(open) => !open && onCloseCategoryModal()}
          placement="center"
          backdrop="blur"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
              <span className="min-w-0 flex-1 truncate">
                {categoryModal.mode === "edit"
                  ? `Edit category in ${categoryModal.areaName || "storage area"}`
                  : `Create new category in ${categoryModal.areaName || "storage area"}`}
              </span>
              <Button
                size="sm"
                radius="full"
                onPress={onSubmitCategoryModal}
                isDisabled={!categoryModal.name.trim()}
                className={`${modalPrimaryButtonClass} h-10 shrink-0 px-4 text-sm font-semibold md:hidden`}
              >
                {categoryModal.mode === "edit" ? "Save" : "Create"}
              </Button>
              <MobileSheetCloseButton onPress={onCloseCategoryModal} />
            </ModalHeader>
            <ModalBody className={modalBodyClass}>
              <Input
                label="Category name"
                value={categoryModal.name}
                onValueChange={(name) => setCategoryModal((prev) => ({ ...prev, name }))}
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
                autoFocus={shouldAutoFocus}
              />
              {categoryModal.mode === "create" && (
                <MobileSuggestionChips
                  suggestions={CATEGORY_SUGGESTIONS}
                  onSelect={(name) => setCategoryModal((prev) => ({ ...prev, name }))}
                />
              )}
              {categoryModal.mode === "create" && (
                <CreateImagePicker
                  label="Category photo optional"
                  imagePreview={categoryModal.imagePreview}
                  imageFile={categoryModal.imageFile}
                  imageMessage={categoryModal.imageMessage}
                  onSelect={(file) => setCreateImageFile(setCategoryModal, file)}
                  onClear={() => clearCreateImageFile(setCategoryModal)}
                />
              )}
              {categoryModal.mode === "edit" && (
                <EntityImageManager
                  entityType="category"
                  entityId={categoryModal.categoryId}
                  imageUrl={categoryModal.imageUrl}
                  label="Category photo"
                  onChange={onCategoryImageChange}
                />
              )}
              {categoryModal.mode === "edit" && (
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <Button
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      onCloseCategoryModal();
                      onOpenDeleteDialog("category", {
                        categoryId: categoryModal.categoryId,
                        storageAreaId: categoryModal.areaId,
                        name: categoryModal.name,
                        areaName: categoryModal.areaName,
                      });
                    }}
                  >
                    Delete category
                  </Button>
                </div>
              )}
            </ModalBody>
            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <Button
                variant="light"
                radius="lg"
                onPress={onCloseCategoryModal}
                className="max-md:hidden"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                radius="lg"
                onPress={onSubmitCategoryModal}
                isDisabled={!categoryModal.name.trim()}
                className={`${modalPrimaryButtonClass} max-md:hidden`}
              >
                {categoryModal.mode === "edit" ? "Save changes" : "Add category"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {itemModal.open && (
        <Modal
          isOpen={itemModal.open}
          onOpenChange={(open) => !open && onCloseItemModal()}
          placement="center"
          backdrop="blur"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
              <span className="min-w-0 flex-1 truncate">
                {itemModal.mode === "edit"
                  ? `Edit item in ${itemModal.categoryName || "category"}`
                  : `Create new item in ${itemModal.categoryName || "category"}`}
              </span>
              <Button
                size="sm"
                radius="full"
                onPress={onSubmitItemModal}
                isDisabled={!itemModal.name.trim()}
                className={`${modalPrimaryButtonClass} h-10 shrink-0 px-4 text-sm font-semibold md:hidden`}
              >
                {itemModal.mode === "edit" ? "Save" : "Add"}
              </Button>
              <MobileSheetCloseButton onPress={onCloseItemModal} />
            </ModalHeader>
            <ModalBody className={`space-y-3 ${modalBodyClass}`}>
              <Input
                label="Item name"
                value={itemModal.name}
                onValueChange={(name) => setItemModal((prev) => ({ ...prev, name }))}
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
                autoFocus={shouldAutoFocus}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <QuantityStepperInput
                  label="Quantity"
                  value={itemModal.quantity}
                  onValueChange={(quantity) =>
                    setItemModal((prev) => ({ ...prev, quantity }))
                  }
                  min={0}
                  classNames={modalInputClassNames}
                />
                <DatePicker
                  label="Expiration date"
                  labelPlacement="inside"
                  value={itemModalExpirationDateValue}
                  onChange={(date) =>
                    setItemModal((prev) => ({
                      ...prev,
                      expirationDate: date ? date.toString() : "",
                    }))
                  }
                  variant="bordered"
                  radius="lg"
                  classNames={modalInputClassNames}
                  showMonthAndYearPickers
                />
              </div>
              {itemModal.mode === "edit" && (
                <EntityImageManager
                  entityType="item"
                  entityId={itemModal.itemId}
                  imageUrl={itemModal.imageUrl}
                  label="Item photo"
                  onChange={onItemImageChange}
                />
              )}
              {itemModal.mode === "create" && (
                <CreateImagePicker
                  label="Item photo optional"
                  imagePreview={itemModal.imagePreview}
                  imageFile={itemModal.imageFile}
                  imageMessage={itemModal.imageMessage}
                  onSelect={(file) => setCreateImageFile(setItemModal, file)}
                  onClear={() => clearCreateImageFile(setItemModal)}
                />
              )}
              {itemModal.mode === "edit" && (
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <Button
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      onCloseItemModal();
                      onOpenDeleteDialog("item", {
                        itemId: itemModal.itemId,
                        categoryId: itemModal.categoryId,
                        storageAreaId: itemModal.areaId,
                        itemName: itemModal.name,
                        categoryName: itemModal.categoryName,
                        areaName:
                          storageAreas.find(
                            (area) => String(area.id) === String(itemModal.areaId)
                          )?.name ?? "this storage area",
                      });
                    }}
                  >
                    Delete item
                  </Button>
                </div>
              )}
            </ModalBody>
            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <Button
                variant="light"
                radius="lg"
                onPress={onCloseItemModal}
                className="max-md:hidden"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                radius="lg"
                onPress={onSubmitItemModal}
                isDisabled={!itemModal.name.trim()}
                className={`${modalPrimaryButtonClass} max-md:hidden`}
              >
                {itemModal.mode === "edit" ? "Save changes" : "Add item"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}

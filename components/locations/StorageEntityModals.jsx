"use client";

import NativeButton from "@/components/ui/NativeButton";
import {
  useEffect,
  useMemo } from "react";
import NativeInput from "@/components/ui/NativeInput";
import DatePicker from "@/components/ui/NativeDatePicker";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
import { FaCamera, FaImage } from "react-icons/fa";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSuggestionChips from "@/components/modals/MobileSuggestionChips";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import QuantityStepperInput from "@/components/modals/QuantityStepperInput";
import ImageWithLoader from "@/components/ui/ImageWithLoader";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  modalTitleClass,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";

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
  isDisabled = false,
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
            <label
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-semibold text-[var(--stocksense-brand)] ${
                isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              <FaImage className="h-3.5 w-3.5" />
              {imageFile ? "Change photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                disabled={isDisabled}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  onSelect(file);
                }}
              />
            </label>
            <label
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-semibold text-[var(--stocksense-brand)] sm:hidden ${
                isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              <FaCamera className="h-3.5 w-3.5" />
              Take photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={isDisabled}
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
                disabled={isDisabled}
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
  savingEntity,
  onAreaImageChange,
  onCategoryImageChange,
  onItemImageChange,
  onOpenDeleteDialog,
}) {
  const isAreaSaving = savingEntity === "area";
  const isCategorySaving = savingEntity === "category";
  const isItemSaving = savingEntity === "item";
  const isSaving = Boolean(savingEntity);
  const shouldAutoFocus = useMemo(
    () => areaModal.open || categoryModal.open || itemModal.open,
    [areaModal.open, categoryModal.open, itemModal.open]
  );
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
          onOpenChange={(open) => !open && !isSaving && onCloseAreaModal()}
          placement="center"
          backdrop="blur"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            <ModalHeader className={`flex items-center gap-3 ${modalHeaderClass}`}>
              <span className={`min-w-0 flex-1 ${modalTitleClass}`}>
                {areaModal.mode === "edit"
                  ? `Edit storage area in ${areaModal.locationName || locationName}`
                  : `Create new storage in ${areaModal.locationName || locationName}`}
              </span>
              <NativeButton
                size="sm"
                radius="full"
                onPress={onSubmitAreaModal}
                isLoading={isAreaSaving}
                isDisabled={isSaving || !areaModal.name.trim()}
                className={`${modalPrimaryButtonClass} h-10 shrink-0 px-4 text-sm font-semibold md:hidden`}
              >
                {areaModal.mode === "edit" ? "Save" : "Create"}
              </NativeButton>
              <MobileSheetCloseButton onPress={onCloseAreaModal} />
            </ModalHeader>
            <ModalBody className={modalBodyClass}>
              <NativeInput
                label="Storage area name"
                value={areaModal.name}
                onValueChange={(name) => setAreaModal((prev) => ({ ...prev, name }))}
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
                autoFocus={shouldAutoFocus}
                isDisabled={isSaving}
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
                  isDisabled={isSaving}
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
                  <NativeButton
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      if (isSaving) return;
                      onCloseAreaModal();
                      onOpenDeleteDialog("area", {
                        areaId: areaModal.areaId,
                        name: areaModal.name,
                      });
                    }}
                    isDisabled={isSaving}
                  >
                    Delete storage area
                  </NativeButton>
                </div>
              )}
            </ModalBody>
            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <NativeButton
                variant="light"
                radius="lg"
                onPress={onCloseAreaModal}
                isDisabled={isSaving}
                className="max-md:hidden"
              >
                Cancel
              </NativeButton>
              <NativeButton
                color="primary"
                radius="lg"
                onPress={onSubmitAreaModal}
                isLoading={isAreaSaving}
                isDisabled={isSaving || !areaModal.name.trim()}
                className={`${modalPrimaryButtonClass} max-md:hidden`}
              >
                {areaModal.mode === "edit" ? "Save changes" : "Add area"}
              </NativeButton>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {categoryModal.open && (
        <Modal
          isOpen={categoryModal.open}
          onOpenChange={(open) => !open && !isSaving && onCloseCategoryModal()}
          placement="center"
          backdrop="blur"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            <ModalHeader className={`flex items-center gap-3 ${modalHeaderClass}`}>
              <span className={`min-w-0 flex-1 ${modalTitleClass}`}>
                {categoryModal.mode === "edit"
                  ? `Edit category in ${categoryModal.areaName || "storage area"}`
                  : `Create new category in ${categoryModal.areaName || "storage area"}`}
              </span>
              <NativeButton
                size="sm"
                radius="full"
                onPress={onSubmitCategoryModal}
                isLoading={isCategorySaving}
                isDisabled={isSaving || !categoryModal.name.trim()}
                className={`${modalPrimaryButtonClass} h-10 shrink-0 px-4 text-sm font-semibold md:hidden`}
              >
                {categoryModal.mode === "edit" ? "Save" : "Create"}
              </NativeButton>
              <MobileSheetCloseButton onPress={onCloseCategoryModal} />
            </ModalHeader>
            <ModalBody className={modalBodyClass}>
              <NativeInput
                label="Category name"
                value={categoryModal.name}
                onValueChange={(name) => setCategoryModal((prev) => ({ ...prev, name }))}
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
                autoFocus={shouldAutoFocus}
                isDisabled={isSaving}
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
                  isDisabled={isSaving}
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
                  <NativeButton
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      if (isSaving) return;
                      onCloseCategoryModal();
                      onOpenDeleteDialog("category", {
                        categoryId: categoryModal.categoryId,
                        storageAreaId: categoryModal.areaId,
                        name: categoryModal.name,
                        areaName: categoryModal.areaName,
                      });
                    }}
                    isDisabled={isSaving}
                  >
                    Delete category
                  </NativeButton>
                </div>
              )}
            </ModalBody>
            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <NativeButton
                variant="light"
                radius="lg"
                onPress={onCloseCategoryModal}
                isDisabled={isSaving}
                className="max-md:hidden"
              >
                Cancel
              </NativeButton>
              <NativeButton
                color="primary"
                radius="lg"
                onPress={onSubmitCategoryModal}
                isLoading={isCategorySaving}
                isDisabled={isSaving || !categoryModal.name.trim()}
                className={`${modalPrimaryButtonClass} max-md:hidden`}
              >
                {categoryModal.mode === "edit" ? "Save changes" : "Add category"}
              </NativeButton>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {itemModal.open && (
        <Modal
          isOpen={itemModal.open}
          onOpenChange={(open) => !open && !isSaving && onCloseItemModal()}
          placement="center"
          backdrop="blur"
          scrollBehavior="inside"
          classNames={mobileSheetModalClassNames}
        >
          <ModalContent className={modalContentClass} style={modalContentStyle}>
            <ModalHeader className={`flex items-center gap-3 ${modalHeaderClass}`}>
              <span className={`min-w-0 flex-1 ${modalTitleClass}`}>
                {itemModal.mode === "edit"
                  ? `Edit item in ${itemModal.categoryName || "category"}`
                  : `Create new item in ${itemModal.categoryName || "category"}`}
              </span>
              <NativeButton
                size="sm"
                radius="full"
                onPress={onSubmitItemModal}
                isLoading={isItemSaving}
                isDisabled={isSaving || !itemModal.name.trim()}
                className={`${modalPrimaryButtonClass} h-10 shrink-0 px-4 text-sm font-semibold md:hidden`}
              >
                {itemModal.mode === "edit" ? "Save" : "Add"}
              </NativeButton>
              <MobileSheetCloseButton onPress={onCloseItemModal} />
            </ModalHeader>
            <ModalBody className={`space-y-3 ${modalBodyClass}`}>
              <NativeInput
                label="Item name"
                value={itemModal.name}
                onValueChange={(name) => setItemModal((prev) => ({ ...prev, name }))}
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
                autoFocus={shouldAutoFocus}
                isDisabled={isSaving}
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
                  isDisabled={isSaving}
                />
                <DatePicker
                  label="Expiration date"
                  labelPlacement="inside"
                  value={itemModal.expirationDate || null}
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
                  isDisabled={isSaving}
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
                  isDisabled={isSaving}
                />
              )}
              {itemModal.mode === "edit" && (
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <NativeButton
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      if (isSaving) return;
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
                    isDisabled={isSaving}
                  >
                    Delete item
                  </NativeButton>
                </div>
              )}
            </ModalBody>
            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <NativeButton
                variant="light"
                radius="lg"
                onPress={onCloseItemModal}
                isDisabled={isSaving}
                className="max-md:hidden"
              >
                Cancel
              </NativeButton>
              <NativeButton
                color="primary"
                radius="lg"
                onPress={onSubmitItemModal}
                isLoading={isItemSaving}
                isDisabled={isSaving || !itemModal.name.trim()}
                className={`${modalPrimaryButtonClass} max-md:hidden`}
              >
                {itemModal.mode === "edit" ? "Save changes" : "Add item"}
              </NativeButton>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}

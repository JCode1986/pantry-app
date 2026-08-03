"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import NativeInput from "@/components/ui/NativeInput";
import NativeButton from "@/components/ui/NativeButton";
import { FaCamera, FaImage, FaPlus, FaTrash, FaUpload } from "react-icons/fa";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSuggestionChips from "@/components/modals/MobileSuggestionChips";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import useDesktopAutoFocus from "@/components/modals/useDesktopAutoFocus";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";
import ImageWithLoader from "@/components/ui/ImageWithLoader";

const CATEGORY_SUGGESTIONS = [
  "Food",
  "Documents",
  "Tools",
  "Medicine",
  "Clothes",
  "Electronics",
];

export default function AreaDetailModals({
  mobileAddOpen,
  setMobileAddOpen,
  editAreaOpen,
  setEditAreaOpen,
  renameModal,
  setRenameModal,
  isSaving,
  newCategory,
  setNewCategory,
  areaName,
  newCategoryImageFile,
  newCategoryImagePreview,
  newCategoryImageMessage,
  onSelectNewCategoryImageFile,
  onClearNewCategoryImageFile,
  onAddCategory,
  editAreaName,
  setEditAreaName,
  areaId,
  areaImageUrl,
  onRenameArea,
  onAreaImageChange,
  onRequestDeleteArea,
  onRenameCategory,
  onCategoryImageChange,
  onRequestDeleteCategory,
}) {
  const shouldAutoFocus = useDesktopAutoFocus(
    mobileAddOpen || editAreaOpen || renameModal.open
  );

  return (
    <>
      <Modal
        isOpen={mobileAddOpen}
        onOpenChange={(open) => {
          if (!open && !isSaving) setMobileAddOpen(false);
        }}
        placement="center"
        scrollBehavior="inside"
        classNames={mobileSheetModalClassNames}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {() => (
            <>
              <ModalHeader
                className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}
              >
                <span className="min-w-0 flex-1 truncate">Create Category</span>
                <NativeButton
                  size="sm"
                  className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                  onPress={onAddCategory}
                  isDisabled={isSaving || !newCategory.trim()}
                  isLoading={isSaving}
                  startContent={!isSaving ? <FaPlus className="h-3.5 w-3.5" /> : null}
                >
                  Create
                </NativeButton>
                <MobileSheetCloseButton onPress={() => setMobileAddOpen(false)} />
              </ModalHeader>
              <ModalBody className={`space-y-4 ${modalBodyClass}`}>
                <NativeInput
                  label="Category name"
                  value={newCategory}
                  onValueChange={setNewCategory}
                  placeholder={`Category in ${areaName}`}
                  radius="lg"
                  variant="bordered"
                  isDisabled={isSaving}
                  classNames={modalInputClassNames}
                  autoFocus={shouldAutoFocus}
                />
                <MobileSuggestionChips
                  suggestions={CATEGORY_SUGGESTIONS}
                  onSelect={setNewCategory}
                />
                <div className="rounded-2xl border border-gray-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                      Category photo optional
                    </div>
                    {newCategoryImageFile ? (
                      <span className="rounded-full bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                        Ready to upload
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-28 sm:w-40">
                      {newCategoryImagePreview ? (
                        <ImageWithLoader
                          src={newCategoryImagePreview}
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
                              onSelectNewCategoryImageFile(file);
                            }}
                          />
                        </label>
                        <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-semibold text-[var(--stocksense-brand)]">
                          <FaUpload className="h-3.5 w-3.5" />
                          {newCategoryImageFile ? "Change photo" : "Add photo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              onSelectNewCategoryImageFile(file);
                            }}
                          />
                        </label>
                        {newCategoryImageFile ? (
                          <NativeButton
                            size="sm"
                            variant="flat"
                            className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                            isDisabled={isSaving}
                            onPress={onClearNewCategoryImageFile}
                            startContent={<FaTrash className="h-3.5 w-3.5" />}
                          >
                            Remove photo
                          </NativeButton>
                        ) : null}
                      </div>
                      <p className="text-xs leading-5 text-gray-500 max-md:hidden">
                        {newCategoryImageFile
                          ? newCategoryImageFile.name
                          : "Take a photo or choose one from your camera roll. Max 5 MB."}
                      </p>
                      {newCategoryImageMessage ? (
                        <p className="text-xs text-rose-700">
                          {newCategoryImageMessage}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
                <NativeButton
                  className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                  onPress={onAddCategory}
                  isDisabled={isSaving || !newCategory.trim()}
                  isLoading={isSaving}
                  startContent={!isSaving ? <FaPlus /> : null}
                >
                  Create Category
                </NativeButton>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={editAreaOpen}
        onOpenChange={setEditAreaOpen}
        placement="center"
        scrollBehavior="inside"
        classNames={mobileSheetModalClassNames}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {(onClose) => (
            <>
              <ModalHeader
                className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}
              >
                <span className="min-w-0 flex-1 truncate">Edit storage area</span>
                <NativeButton
                  size="sm"
                  className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                  onPress={onRenameArea}
                  isLoading={isSaving}
                  isDisabled={!editAreaName.trim()}
                >
                  Save
                </NativeButton>
                <MobileSheetCloseButton onPress={onClose} />
              </ModalHeader>
              <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                <NativeInput
                  label="Storage area name"
                  value={editAreaName}
                  onValueChange={setEditAreaName}
                  variant="bordered"
                  radius="lg"
                  isDisabled={isSaving}
                  classNames={modalInputClassNames}
                />
                <EntityImageManager
                  entityType="storage_area"
                  entityId={areaId}
                  imageUrl={areaImageUrl}
                  label="Storage area photo"
                  onChange={onAreaImageChange}
                />
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <NativeButton
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      onClose();
                      onRequestDeleteArea();
                    }}
                  >
                    Delete storage area
                  </NativeButton>
                </div>
              </ModalBody>
              <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
                <NativeButton
                  variant="light"
                  onPress={onClose}
                  isDisabled={isSaving}
                  className="max-md:hidden"
                >
                  Cancel
                </NativeButton>
                <NativeButton
                  className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                  onPress={onRenameArea}
                  isLoading={isSaving}
                  isDisabled={!editAreaName.trim()}
                >
                  Save changes
                </NativeButton>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={renameModal.open}
        onOpenChange={(open) => setRenameModal((p) => ({ ...p, open }))}
        placement="center"
        scrollBehavior="inside"
        classNames={mobileSheetModalClassNames}
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {(onClose) => (
            <>
              <ModalHeader
                className={`${modalHeaderClass} max-md:flex max-md:items-center max-md:gap-3`}
              >
                <span className="min-w-0 flex-1 truncate">Edit category</span>
                <NativeButton
                  size="sm"
                  className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                  onPress={onRenameCategory}
                  isDisabled={isSaving || !renameModal.name.trim()}
                >
                  Save
                </NativeButton>
                <MobileSheetCloseButton onPress={onClose} />
              </ModalHeader>
              <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                <NativeInput
                  value={renameModal.name}
                  onValueChange={(v) => setRenameModal((p) => ({ ...p, name: v }))}
                  variant="bordered"
                  radius="lg"
                  label="Category name"
                  isDisabled={isSaving}
                  classNames={modalInputClassNames}
                />
                <EntityImageManager
                  entityType="category"
                  entityId={renameModal.id}
                  imageUrl={renameModal.imageUrl}
                  label="Category photo"
                  onChange={onCategoryImageChange}
                />
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <NativeButton
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      const target = {
                        id: renameModal.id,
                        name: renameModal.name,
                        busy: false,
                      };
                      onClose();
                      onRequestDeleteCategory(target);
                    }}
                  >
                    Delete category
                  </NativeButton>
                </div>
              </ModalBody>
              <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
                <NativeButton
                  variant="light"
                  onPress={onClose}
                  isDisabled={isSaving}
                  className="max-md:hidden"
                >
                  Cancel
                </NativeButton>
                <NativeButton
                  className="bg-[var(--stocksense-brand)] text-white max-md:hidden"
                  onPress={onRenameCategory}
                  isDisabled={isSaving || !renameModal.name.trim()}
                >
                  Save changes
                </NativeButton>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
import NativeInput from "@/components/ui/NativeInput";
import NativeButton from "@/components/ui/NativeButton";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
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

export default function CategoryEditModal({
  isOpen,
  onOpenChange,
  categoryId,
  categoryImageUrl,
  editCategoryName,
  isSaving,
  onEditCategoryNameChange,
  onSave,
  onImageChange,
  onDelete,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
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
              <span className={`min-w-0 flex-1 ${modalTitleClass}`}>Edit category</span>
              <NativeButton
                size="sm"
                className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                onPress={onSave}
                isLoading={isSaving}
                isDisabled={!editCategoryName.trim()}
              >
                Save
              </NativeButton>
              <MobileSheetCloseButton onPress={onClose} />
            </ModalHeader>
            <ModalBody className={`space-y-3 ${modalBodyClass}`}>
              <NativeInput
                label="Category name"
                value={editCategoryName}
                onValueChange={onEditCategoryNameChange}
                isDisabled={isSaving}
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
              />
              <EntityImageManager
                entityType="category"
                entityId={categoryId}
                imageUrl={categoryImageUrl}
                label="Category photo"
                onChange={onImageChange}
              />
              <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                <NativeButton
                  className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                  onPress={() => {
                    onClose();
                    onDelete();
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
                className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                onPress={onSave}
                isLoading={isSaving}
                isDisabled={!editCategoryName.trim()}
              >
                Save changes
              </NativeButton>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

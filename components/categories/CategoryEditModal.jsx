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
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
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
              <span className="min-w-0 flex-1 truncate">Edit category</span>
              <Button
                size="sm"
                className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                onPress={onSave}
                isLoading={isSaving}
                isDisabled={!editCategoryName.trim()}
              >
                Save
              </Button>
              <MobileSheetCloseButton onPress={onClose} />
            </ModalHeader>
            <ModalBody className={`space-y-3 ${modalBodyClass}`}>
              <Input
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
                <Button
                  className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                  onPress={() => {
                    onClose();
                    onDelete();
                  }}
                >
                  Delete category
                </Button>
              </div>
            </ModalBody>
            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={isSaving}
                className="max-md:hidden"
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-[var(--stocksense-brand)] text-white max-md:hidden"
                onPress={onSave}
                isLoading={isSaving}
                isDisabled={!editCategoryName.trim()}
              >
                Save changes
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

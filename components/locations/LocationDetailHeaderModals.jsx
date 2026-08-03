"use client";

import NativeInput from "@/components/ui/NativeInput";
import NativeButton from "@/components/ui/NativeButton";
import dynamic from "next/dynamic";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
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

const EntityImageManager = dynamic(
  () => import("@/components/inventory/EntityImageManager"),
  { ssr: false }
);
const ConfirmDeleteModal = dynamic(
  () => import("@/components/modals/ConfirmDeleteModal"),
  { ssr: false }
);

export default function LocationDetailHeaderModals({
  locationId,
  locationName,
  currentImageUrl,
  editOpen,
  setEditOpen,
  editName,
  setEditName,
  isSaving,
  onSave,
  onImageChange,
  deleteOpen,
  setDeleteOpen,
  isDeleting,
  onDelete,
}) {
  return (
    <>
      <Modal
        isOpen={editOpen}
        onOpenChange={setEditOpen}
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
                <span className="min-w-0 flex-1 truncate">Edit location</span>
                <NativeButton
                  size="sm"
                  className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                  onPress={onSave}
                  isLoading={isSaving}
                  isDisabled={!editName.trim()}
                >
                  Save
                </NativeButton>
                <MobileSheetCloseButton onPress={onClose} />
              </ModalHeader>
              <ModalBody className={`space-y-3 ${modalBodyClass}`}>
                <NativeInput
                  label="Location name"
                  value={editName}
                  onValueChange={setEditName}
                  variant="bordered"
                  radius="lg"
                  isDisabled={isSaving}
                  classNames={modalInputClassNames}
                />
                <EntityImageManager
                  entityType="location"
                  entityId={locationId}
                  imageUrl={currentImageUrl}
                  label="Location photo"
                  onChange={onImageChange}
                />
                <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                  <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                  <NativeButton
                    className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                    onPress={() => {
                      onClose();
                      setDeleteOpen(true);
                    }}
                  >
                    Delete location
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
                  isDisabled={!editName.trim()}
                >
                  Save changes
                </NativeButton>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        isDeleting={isDeleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={onDelete}
        title={`Delete location "${locationName}"?`}
        description={`This will delete "${locationName}" and everything stored inside it. This cannot be undone.`}
      />
    </>
  );
}

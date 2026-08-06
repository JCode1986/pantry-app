"use client";

import NativeButton from "@/components/ui/NativeButton";
import NativeInput from "@/components/ui/NativeInput";
import DatePicker from "@/components/ui/NativeDatePicker";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
import { FaBarcode } from "react-icons/fa";
import EntityImageManager from "@/components/inventory/EntityImageManager";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";
import QuantityStepperInput from "@/components/modals/QuantityStepperInput";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  modalSubtitleClass,
  modalTitleClass,
  mobileSheetModalClassNames,
} from "@/components/modals/modalTheme";

export default function CategoryItemEditModal({
  isOpen,
  itemModal,
  categoryName,
  isSaving,
  onClose,
  onSave,
  onItemModalChange,
  onImageChange,
  onDelete,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      placement="center"
      scrollBehavior="inside"
      classNames={mobileSheetModalClassNames}
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {() => (
          <>
            <ModalHeader className={`flex items-center gap-3 ${modalHeaderClass}`}>
              <span className="min-w-0 flex-1">
                <span className={`block ${modalTitleClass}`}>Edit item</span>
                <span className={`block ${modalSubtitleClass}`}>
                  {categoryName}
                </span>
              </span>
              <NativeButton
                size="sm"
                className="h-10 shrink-0 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white md:hidden"
                onPress={onSave}
                isLoading={isSaving}
                isDisabled={isSaving || !itemModal.name.trim()}
              >
                Save
              </NativeButton>
              <MobileSheetCloseButton onPress={onClose} />
            </ModalHeader>
            <ModalBody className={`space-y-3 ${modalBodyClass}`}>
              <NativeInput
                label="Item name"
                value={itemModal.name}
                onValueChange={(value) =>
                  onItemModalChange((prev) => ({ ...prev, name: value }))
                }
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <QuantityStepperInput
                  label="Quantity"
                  min={0}
                  value={itemModal.quantity}
                  onValueChange={(value) =>
                    onItemModalChange((prev) => ({ ...prev, quantity: value }))
                  }
                  classNames={modalInputClassNames}
                />
                <DatePicker
                  label="Expiration date"
                  labelPlacement="inside"
                  value={itemModal.expirationDate || null}
                  onChange={(date) =>
                    onItemModalChange((prev) => ({
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
              <NativeInput
                label="Barcode"
                value={itemModal.barcode}
                onValueChange={(value) =>
                  onItemModalChange((prev) => ({ ...prev, barcode: value }))
                }
                variant="bordered"
                radius="lg"
                startContent={<FaBarcode className="text-gray-400" />}
                classNames={modalInputClassNames}
              />
              <EntityImageManager
                entityType="item"
                entityId={itemModal.itemId}
                imageUrl={itemModal.imageUrl}
                label="Item photo"
                onChange={onImageChange}
              />
              <div className="rounded-2xl border border-rose-200 bg-white p-3 md:hidden">
                <p className="text-sm font-semibold text-gray-950">Danger zone</p>
                <NativeButton
                  className="mt-3 min-h-11 w-full rounded-xl bg-rose-600 text-white"
                  onPress={() => {
                    onDelete({
                      id: itemModal.itemId,
                      name: itemModal.name,
                    });
                  }}
                >
                  Delete item
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
                isDisabled={!itemModal.name.trim()}
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
